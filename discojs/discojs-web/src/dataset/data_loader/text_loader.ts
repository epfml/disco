import { v4 as randomUUID } from 'uuid'
import { dataset } from '../..'
import { Deferred } from './cache'

type MessageData = {
    value: {
        type: 'Buffer'
        data: number[]
    }
    done: boolean
}

export class WebTextLoader extends dataset.loader.TextLoader {
    static readonly CACHE_SIZE: number = 10

    // ========================= WORKER + CACHE =========================
    // TODO:? make this faster than just having a ws instance in the loader
    // getWorker = (file: string, config: dataset.TextConfig) => {
    //     const workerURL = new URL('worker.ts', import.meta.url).href
    //     const worker = new Worker(workerURL, {
    //         env: {
    //             FILE: file,
    //             CONFIG: JSON.stringify(config),
    //             CACHE_SIZE: WebTextLoader.CACHE_SIZE,
    //         },
    //     } as WorkerOptions)

    //     return new Promise<Worker>((resolve) => {
    //         // waiting for a message from the worker to inform the loader
    //         // that the websocket connection is opened
    //         worker.onmessage = () => {
    //             resolve(worker)
    //         }
    //     })
    // }

    getWebsocket(file: string, config: dataset.TextConfig) {
        const BROKER_URL = 'ws://localhost:3001/ws'
        const url = new URL(BROKER_URL)

        const id = randomUUID()
        const searchParams: dataset.WSSearchParams = {
            id,
            config: JSON.stringify(config),
            file,
        }
        for (const [k, v] of Object.entries(searchParams))
            url.searchParams.append(k, v)

        const ws = new WebSocket(url)

        ws.onerror = (err) => {
            console.error(err)
        }

        return new Promise<{ ws: WebSocket; id: string }>((resolve) => {
            ws.onopen = () => {
                resolve({ ws, id })
            }
        })
    }

    async load(
        file: string,
        config: dataset.TextConfig
    ): Promise<dataset.TokenizedDataset> {
        // TODO: /!\ implement a way to close websocket at the end of training
        // onTrainEnd = () => ws.close()

        // ========================= WORKER + CACHE =========================
        // TODO:? make this faster than just having a ws instance in the loader
        // const worker = await this.getWorker(file, config)
        // const cache = await Cache.init<CacheData>(
        //     WebTextLoader.CACHE_SIZE,
        //     (pos, init) => {
        //         worker.postMessage(JSON.stringify({ pos, init }))
        //     },
        //     (c) => {
        //         worker.onmessage = (payload: globalThis.MessageEvent<any>) => {
        //             const sample = JSON.parse(
        //                 payload.data as string
        //             ) as CacheData
        //             c.put(sample.pos, sample)
        //         }
        //     }
        // )
        const { ws, id } = await this.getWebsocket(file, config)
        const cache = new Deferred<{ value: number[]; done: boolean }>()

        ws.onmessage = (payload: globalThis.MessageEvent<any>) => {
            const sample = JSON.parse(payload.data as string) as MessageData
            cache.resolve({ value: sample.value.data, done: sample.done })
        }

        const iterator = {
            next: async () => {
                ws.send(JSON.stringify({ id }))
                const sample = await cache.promise
                cache.reset()
                return sample
            },
        }

        const dataset = await this.getCoreDataset(config, iterator)
        return dataset
    }

    async loadAll(
        source: dataset.TextSource,
        config?: Partial<dataset.TextConfig> | undefined
    ): Promise<dataset.DataSplit> {
        const _config = this.resolveConfig(config)

        const loadFromSources = async (files: string[]) => {
            const datasets = await Promise.all(
                files.map((f) => this.load(f, _config)) ?? []
            )
            const ds =
                datasets.length > 1
                    ? datasets
                          .slice(1)
                          .reduce(
                              (acc, cur) => acc.concatenate(cur),
                              datasets[0]
                          )
                    : datasets[0]
            return await dataset.TextData.init(ds, this.task)
        }

        return {
            train: await loadFromSources(source.train),
            validation:
                source.validation && (await loadFromSources(source.validation)),
        }
    }
}
