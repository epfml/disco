import isomorphic from 'isomorphic-ws'
import type { Peer, SignalData } from './decentralized/peer.js'
import { type NodeID } from './types.js'
import msgpack from 'msgpack-lite'
import * as decentralizedMessages from './decentralized/messages.js'
import { type, type NarrowMessage, type Message } from './messages.js'
import { timeout } from './utils.js'

import { EventEmitter } from '../utils/event_emitter.js'

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

export class PeerConnection extends EventEmitter<{ [K in type]: NarrowMessage<K> }> implements EventConnection {
  constructor (
    private readonly ownId: NodeID,
    private readonly peer: Peer,
    private readonly signallingServer: EventConnection
  ) {
    super()
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

      this.emit(msg.type, msg)
    })

    this.peer.on('close', () => { console.warn('peer', this.peer.id, 'closed connection') })

    await new Promise<void>((resolve) => {
      this.peer.on('connect', resolve)
    })
  }

  signal (signal: SignalData): void {
    this.peer.signal(signal)
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

export class WebSocketServer extends EventEmitter<{ [K in type]: NarrowMessage<K> }> implements EventConnection {
  private constructor (
    private readonly socket: isomorphic.WebSocket,
    private readonly validateReceived?: (msg: any) => boolean,
    private readonly validateSent?: (msg: any) => boolean
  ) { super() }

  static async connect (url: URL,
    validateReceived?: (msg: any) => boolean,
    validateSent?: (msg: any) => boolean): Promise<WebSocketServer> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    const server: WebSocketServer = new WebSocketServer(ws, validateReceived, validateSent)

    ws.onmessage = (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }

      const msg = msgpack.decode(new Uint8Array(event.data))

      // Validate message format
      if (validateReceived !== undefined && !validateReceived(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      server.emit(msg.type, msg)
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) => {
        reject(new Error(`Server unreachable: ${err.message}`))
      }
      ws.onopen = () => { resolve(server) }
    })
  }

  disconnect (): void {
    this.socket.close()
  }

  send (msg: Message): void {
    if (this.validateSent !== undefined && !this.validateSent(msg)) {
      throw new Error(`can't send this type of message: ${JSON.stringify(msg)}`)
    }

    this.socket.send(msgpack.encode(msg))
  }
}
