import { tf } from '../../'
import { Dataset } from '../dataset'
import { TextData, Data, DataSplit } from '../data'
import { DataConfig, DataLoader } from '.'

export interface TextConfig extends DataConfig {
    blockSize: number
    vocabSize: number
    batchSize?: number
}

export type BatchedTokenizedTensorSample = {
    xs: tf.Tensor2D // tokens of size (B, blockSize)
    ys: tf.Tensor3D // one hot encoded vector of size (B, blockSize, vocabSize)
}

export type TokenizedDataset = Dataset<BatchedTokenizedTensorSample>

export type TokenizedIterResult = IteratorResult<
    BatchedTokenizedTensorSample,
    BatchedTokenizedTensorSample
>

export type TextSource = {
    train: string[]
    validation?: string[]
}

export type ParsedWSSearchParams = {
    id: string
    config: TextConfig
    file: string
}
export type WSSearchParams = Record<keyof ParsedWSSearchParams, string>

// type AsyncTokenizedGenerator = AsyncGenerator<TokenizedSample, void, unknown>
type AsyncTokenizedGenerator = AsyncGenerator<
    BatchedTokenizedTensorSample,
    void,
    unknown
>

type CoreElement = number[] | Buffer | Uint8Array
type CoreIterator = AsyncIterator<CoreElement, CoreElement, CoreElement>

/**
 * Text data loader whose instantiable implementation is delegated by the platform-dependent Disco subprojects, namely,
 * @epfml/discojs-web and @epfml/discojs-node.
 */
// TODO: does shuffle work for the text loader? -> add tests
export abstract class TextLoader extends DataLoader<
    string,
    TextSource,
    TextConfig
> {
    // Default config required to define TextConfig but leave DataConfig optional
    static DEFAULT_CONFIG: Required<Omit<TextConfig, keyof DataConfig>> &
        DataConfig = {
        blockSize: 128,
        vocabSize: 50258,
        batchSize: 4,
    }

    // TODO: remove this when refactor TASK is done
    // and requires batchSize, blockSize and vocabSize
    // to be required for any text task!
    getBatchSize(config: TextConfig): number {
        return (
            config.batchSize ||
            this.task.trainingInformation.datasetBatchSize ||
            TextLoader.DEFAULT_CONFIG.batchSize
        )
    }

    // TODO: remove this when refactor TASK is done
    // and finally requires batchSize, blockSize and vocabSize
    // to be required for any text task!
    resolveConfig(config?: Partial<TextConfig>): TextConfig {
        return Object.assign({}, TextLoader.DEFAULT_CONFIG, config)
    }

    /**
     * Core dataset, shared between node and web versions
     * Takes an iterator that yields arrays of numbers and turns
     * them into structured batch of tuples x, y
     * @param config
     * @param requestNext
     * @returns A TokenizedDataset = tfjs dataset containing xs and ys tensors
     */
    async getCoreDataset(
        config: TextConfig,
        iterator: CoreIterator
    ): Promise<TokenizedDataset> {
        const toUInt16 = (low: number, high: number) => {
            low &= 0xff
            high &= 0xff
            return (high << 8) | low
        }

        const { vocabSize, blockSize } = config
        const batchSize = this.getBatchSize(config)
        const sampleSize = blockSize + 1

        async function* generator(): AsyncTokenizedGenerator {
            let next = iterator.next()
            while (true) {
                const { value: chunk } = await next
                if (!chunk) break

                // pre-fetch the next chunk even before actually requesting it
                next = iterator.next()

                const xs = tf.buffer([batchSize, blockSize], 'int32')
                const ys = tf.buffer([batchSize, blockSize, vocabSize], 'int32')

                for (let i = 0; i < batchSize; i++) {
                    for (let j = 0; j < sampleSize; j++) {
                        const idx = (i * sampleSize + j) * 2
                        const low = chunk[idx]
                        const high = chunk[idx + 1]
                        const token = toUInt16(low, high)
                        if (j < sampleSize - 1) xs.set(token, i, j)
                        if (j > 0) ys.set(1, i, j - 1, token)
                    }
                }

                const x = xs.toTensor()
                const y = ys.toTensor()
                yield {
                    xs: x as tf.Tensor2D,
                    ys: y as tf.Tensor3D,
                }
                tf.dispose([x, y])
            }
        }

        // cast as any because tf.data.generator does not take a type AsyncGenerator (but it works)
        return tf.data.generator(generator as any)
    }

    abstract load(source: string, config: TextConfig): Promise<TokenizedDataset>

    // TODO: not a fan of the TextConfig, it becomes tricky to know what parameters are set where
    // because of they are set in the task AND/OR in the config
    // when Task objects are refactor => try to remove TextConfig entirely
    // or at least don't overlap keys with the task trainingInfo keys
    abstract loadAll(
        source: TextSource,
        config?: Partial<TextConfig>
    ): Promise<DataSplit>

    async createData(dataset: Dataset): Promise<Data> {
        return await TextData.init(dataset, this.task)
    }
}
