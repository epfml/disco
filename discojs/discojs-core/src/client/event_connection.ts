import isomorphic from 'isomorphic-ws'
import { EventEmitter } from 'events'
import { Peer } from './decentralized/peer'
import { NodeID } from './types'
import msgpack from 'msgpack-lite'
import * as decentralizedMessages from './decentralized/messages'
import { type, NarrowMessage, Message } from './messages'
import { SignalData } from 'simple-peer'
import { timeout } from './utils'

export interface EventConnection {
  on: <K extends type>(type: K, handler: (event: NarrowMessage<K>) => void) => void
  once: <K extends type>(type: K, handler: (event: NarrowMessage<K>) => void) => void
  send: <T extends Message>(msg: T) => void
  disconnect: () => void
}

export async function waitMessage<T extends type> (connection: EventConnection, type: T): Promise<NarrowMessage<T>> {
  return await new Promise((resolve) => {
    // "once" is important because we can't resolve the same promise multiple times
    connection.once(type, (event) => {
      resolve(event)
    })
  })
}

export async function waitMessageWithTimeout<T extends type> (connection: EventConnection, type: T, timeoutMs?: number): Promise<NarrowMessage<T>> {
  return await Promise.race([waitMessage(connection, type), timeout(timeoutMs)])
}

export class PeerConnection implements EventConnection {
  private readonly eventEmitter: EventEmitter

  constructor (
    private readonly ownId: NodeID,
    private readonly peer: Peer,
    private readonly signallingServer: EventConnection
  ) {
    this.eventEmitter = new EventEmitter()
  }

  async connect (): Promise<void> {
    this.peer.on('signal', (signal) => {
      const msg: decentralizedMessages.SignalForPeer = {
        type: type.SignalForPeer,
        peer: this.peer.id,
        signal
      }
      this.signallingServer.send(msg)
    })

    this.peer.on('data', (data) => {
      const msg = msgpack.decode(data)

      if (!decentralizedMessages.isPeerMessage(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      this.eventEmitter.emit(msg.type.toString(), msg)
    })

    this.peer.on('close', () => console.warn('peer', this.peer.id, 'closed connection'))

    return await new Promise((resolve) => {
      this.peer.on('connect', () => {
        resolve()
      })
    })
  }

  signal (signal: SignalData): void {
    this.peer.signal(signal)
  }

  on<K extends type> (type: K, handler: (event: NarrowMessage<K>) => void): void {
    this.eventEmitter.on(type.toString(), handler)
  }

  once<K extends type> (type: K, handler: (event: NarrowMessage<K>) => void): void {
    this.eventEmitter.once(type.toString(), handler)
  }

  send <T extends Message> (msg: T): void {
    if (!decentralizedMessages.isPeerMessage(msg)) {
      throw new Error(`can't send this type of message: ${JSON.stringify(msg)}`)
    }
    this.peer.send(msgpack.encode(msg))
  }

  disconnect (): void {
    this.peer.destroy()
  }
}

export class WebSocketServer implements EventConnection {
  private constructor (
    private readonly socket: isomorphic.WebSocket,
    private readonly eventEmitter: EventEmitter,
    private readonly validateReceived?: (msg: any) => boolean,
    private readonly validateSent?: (msg: any) => boolean
  ) { }

  static async connect (url: URL,
    validateReceived?: (msg: any) => boolean,
    validateSent?: (msg: any) => boolean): Promise<WebSocketServer> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    const emitter: EventEmitter = new EventEmitter()
    const server: WebSocketServer = new WebSocketServer(ws, emitter, validateReceived, validateSent)

    ws.onmessage = (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }

      const msg = msgpack.decode(new Uint8Array(event.data))

      // Validate message format
      if (validateReceived && !validateReceived(msg)) {
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
  on<K extends type>(type: K, handler: (event: NarrowMessage<K>) => void): void {
    this.eventEmitter.on(type.toString(), handler)
  }

  once<K extends type>(type: K, handler: (event: NarrowMessage<K>) => void): void {
    this.eventEmitter.once(type.toString(), handler)
  }

  send (msg: Message): void {
    if (this.validateSent && !this.validateSent(msg)) {
      throw new Error(`can't send this type of message: ${JSON.stringify(msg)}`)
    }

    this.socket.send(msgpack.encode(msg))
  }
}
