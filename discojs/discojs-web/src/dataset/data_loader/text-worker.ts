// prevents TS errors
declare var self: Worker

import { v4 as randomUUID } from 'uuid'
import { dataset } from '../..'
import { Cache } from './cache'

type MessageData = {
    value: {
        type: 'Buffer'
        data: number[]
    }
    done: boolean
    pos: number
}

export type CacheData = {
    value: number[]
    done: boolean
    pos: number
}

// TODO: make brokerURL configurable and at least stored in .env
// or automatically retrieved and compatible with websocket server somehow
const BROKER_URL = 'ws://localhost:3001/ws'

const { FILE, CONFIG, CACHE_SIZE } = process.env as {
    ID: string
    FILE: string
    CONFIG: string
    CACHE_SIZE: string
}

/**
 * Creates a url and connect to the websocket server
 * @param file: filename corresponding to the file the websocket server will stream
 * @param config entries: all the config key, value pairs. The config object will be reconstructed in the websocket server side
 */
const getWebsocket = () => {
    const url = new URL(BROKER_URL)

    const id = randomUUID()
    const searchParams: dataset.WSSearchParams = {
        id,
        config: CONFIG,
        file: FILE,
    }
    for (const [k, v] of Object.entries(searchParams))
        url.searchParams.append(k, v)

    const ws = new WebSocket(url)

    ws.onerror = (err) => {
        console.error(err)
    }

    return { ws, id }
}

const { ws, id } = getWebsocket()

const proceed = async () => {
    console.log('worker', id, 'connected')

    const request = (pos: number) => {
        // console.log(Date.now(), 'WORKER requesting next value', pos)
        ws.send(JSON.stringify({ pos, id }))
    }

    const cache = await Cache.init<CacheData>(
        parseInt(CACHE_SIZE),
        request,
        (c) => {
            ws.onmessage = (payload: MessageEvent) => {
                const { value, done, pos } = JSON.parse(
                    payload.data as string
                ) as MessageData
                // console.log(Date.now(), 'WORKER received from ws', pos)
                c.put(pos, { value: value.data, done, pos })
            }
        }
    )

    self.onmessage = async (event: MessageEvent<string>) => {
        // console.log(Date.now(), 'WORKER onmessage')
        // console.time('onmessage')
        const sample = await cache.next()
        // console.timeEnd('onmessage')
        postMessage(JSON.stringify(sample))
    }

    self.postMessage('connected')
}

ws.onopen = proceed
