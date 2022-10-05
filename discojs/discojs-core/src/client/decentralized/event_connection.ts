import isomorphic from 'isomorphic-ws'
import { EventEmitter } from 'events'
import msgpack from 'msgpack-lite'
import * as messages from './messages'

export interface EventConnection {
  on: <K extends messages.type>(type: K, handler: (event: messages.NarrowMessage<K>) => void) => void
  once: <K extends messages.type>(type: K, handler: (event: messages.NarrowMessage<K>) => void) => void
  send: <T extends messages.Message>(msg: T) => void
  disconnect: () => void
}

export async function waitMessage<T extends messages.type> (connection: EventConnection, type: T): Promise<messages.NarrowMessage<T>> {
  return await new Promise((resolve) => {
    // "once" is important because we can't resolve the same promise multiple time
    connection.once(type, (event) => {
      resolve(event)
    })
  })
}

export class WebSocketServer implements EventConnection {
  private constructor (
    private readonly socket: WebSocket,
    private readonly eventEmitter: EventEmitter
  ) { }

  static async connect (url: URL): Promise<WebSocketServer> {
    const WS = typeof window !== 'undefined' ? window.WebSocket : isomorphic.WebSocket
    const ws: WebSocket = new WS(url)
    ws.binaryType = 'arraybuffer'

    const emitter: EventEmitter = new EventEmitter()
    const server: WebSocketServer = new WebSocketServer(ws, emitter)

    ws.onmessage = (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }

      const msg = msgpack.decode(new Uint8Array(event.data))
      if (!messages.isMessageFromServer(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      emitter.emit(msg.type.toString(), msg)
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`)) // eslint-disable-line @typescript-eslint/restrict-template-expressions
      ws.onopen = () => resolve(server)
    })
  }

  disconnect (): void {
    this.socket.close()
  }

  // Not straigtforward way of making sure the handler take the correct message type as a parameter, for typesafety
  on<K extends messages.type>(type: K, handler: (event: messages.NarrowMessage<K>) => void): void {
    this.eventEmitter.on(type.toString(), handler)
  }

  once<K extends messages.type>(type: K, handler: (event: messages.NarrowMessage<K>) => void): void {
    this.eventEmitter.once(type.toString(), handler)
  }

  send (msg: messages.Message): void {
    if (!messages.isMessageToServer(msg)) {
      throw new Error(`can't send this type of message: ${JSON.stringify(msg)}`)
    }

    this.socket.send(msgpack.encode(msg))
  }
}
