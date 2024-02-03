import { dataset } from '../..'
import fs from 'fs'
import { List } from 'immutable'

/*

TODO: Bun.file().stream() is kind of broken for now
See: https://github.com/oven-sh/bun/pull/7506
and: https://github.com/oven-sh/bun/issues/7057
When the PR is merged, we can probably use the following code:

const stream = Bun.file(source).stream()
async function* generator() {
    for await (const chunk of stream) {
        console.log('GENERATOR', chunk.length)
        yield chunk
    }
}
return { stream, iter: generator() }


async getInfiniteBufferIteratorFromFile(
        source: string,
        config: dataset.TextConfig
    ): Promise<AsyncIterator<Uint8Array, Uint8Array, Uint8Array>> {
        const getStream = async () => {
            return await this.getFileStream(source, config)
        }
        let { stream, iter } = await getStream()
        return {
            next: async () => {
                let sample = await iter.next()
                if (!sample || !sample.value || sample.done) {
                    await stream.cancel()
                    const newStream = await getStream()
                    stream = newStream.stream
                    iter = newStream.iter
                    sample = await iter.next()
                    if (!sample || !sample.value || sample.done) {
                        throw new Error(
                            'Getting a sample from the file stream still fails after retrying, most likely the file at ' +
                                source +
                                ' is empty..'
                        )
                    }
                }
                return sample as IteratorResult<Uint8Array, Uint8Array>
            },
        }
    }

*/

export class NodeTextLoader extends dataset.loader.TextLoader {
    /**
     * Creates a file stream from a dataset filename.
     * This stream will contain a specific number of bytes
     * defined by the highWaterMark parameter which depends on the
     * block size and batch size. This ensures that reading the stream
     * always return a chunk of data of the same, required, size.
     * @param source: dataset filename to stream from
     * @param config: TextConfig
     * @returns a file stream
     */
    getFileStream(source: string, chunkSize: number) {
        return new Promise<fs.ReadStream>((resolve) => {
            const stream = fs.createReadStream(source, {
                fd: undefined,
                highWaterMark: chunkSize,
            })
            stream.on('readable', () => resolve(stream))
        })
    }

    getChunkSize(config: dataset.TextConfig) {
        const batchSize = this.getBatchSize(config)
        // blockSize + 1 = input size (size of x = blockSize, size of y = blockSize shifted right by 1, thus the + 1)
        // * batchSize to retrieve a batch at once
        // * 2 because tokens are stored as uint16 and thus require 2 bytes
        return (config.blockSize + 1) * batchSize * 2
    }

    /**
     * Creates an infinite iterator from a file stream
     * meaning when the stream reaches the end of the file
     * it will start again from the beginning
     * @param source: dataset filename to stream from
     * @param config: TextConfig
     * @returns an infinite iterator over a file stream
     */
    async getInfiniteBufferIteratorFromFile(
        source: string,
        config: dataset.TextConfig
    ): Promise<AsyncIterator<Buffer, Buffer, Buffer>> {
        const chunkSize = this.getChunkSize(config)

        if (isNaN(chunkSize))
            throw new Error(
                'chunk size, is NaN but is supposed to be of type number'
            )

        const getStream = async () =>
            await this.getFileStream(source, chunkSize)

        let stream = await getStream()
        return {
            next: async () => {
                let buffer = (await stream.read(chunkSize)) as
                    | Buffer
                    | undefined
                if (!buffer) {
                    stream.close()
                    stream = await getStream()
                    buffer = await stream.read(chunkSize)
                    if (!buffer) {
                        throw new Error(
                            'Getting a sample from the file stream still fails after retrying, most likely the file at ' +
                                source +
                                ' is empty..'
                        )
                    }
                }
                return { value: buffer, done: false }
            },
        }
    }

    async load(
        source: string,
        config: dataset.TextConfig
    ): Promise<dataset.TokenizedDataset> {
        const requestNext = await this.getInfiniteBufferIteratorFromFile(
            source,
            config
        )
        const dataset = await this.getCoreDataset(config, requestNext)
        return dataset
    }

    async loadAll(
        source: dataset.TextSource,
        config?: Partial<dataset.TextConfig>
    ): Promise<dataset.DataSplit> {
        const _config = this.resolveConfig(config)
        const split: Partial<dataset.DataSplit> = {}
        for await (const [k, files] of Object.entries(source)) {
            const datasets = await Promise.all(
                files.map(async (src) => await this.load(src, _config))
            )
            const dataset = List(datasets).reduce(
                (acc: dataset.Dataset, dataset) => acc.concatenate(dataset)
            )
            const data = await this.createData(dataset)
            ;(split as dataset.DataSplit)[k as keyof typeof split] = data
        }
        return split as dataset.DataSplit
    }
}
