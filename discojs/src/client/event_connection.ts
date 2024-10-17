import createDebug from "debug";
import WebSocket from "isomorphic-ws";
import * as msgpack from "@msgpack/msgpack";

import type { Peer, SignalData } from './decentralized/peer.js'
import { type NodeID } from './types.js'
import * as decentralizedMessages from './decentralized/messages.js'
import { type, type NarrowMessage, type Message } from './messages.js'
import { timeout } from './utils.js'

import { EventEmitter } from '../utils/event_emitter.js'

const debug = createDebug("discojs:client:connections");

export interface EventConnection {
  on: <K extends type>(type: K, handler: (event: NarrowMessage<K>) => void) => void
  once: <K extends type>(type: K, handler: (event: NarrowMessage<K>) => void) => void
  send: <T extends Message>(msg: T) => void
  disconnect: () => Promise<void>
}

export async function waitMessage<T extends type> (connection: EventConnection, type: T): Promise<NarrowMessage<T>> {
  return await new Promise((resolve) => {
    // "once" is important because we can't resolve the same promise multiple times
    connection.once(type, (event) => {
      resolve(event)
    })
  })
}

export async function waitMessageWithTimeout<T extends type>(
  connection: EventConnection,
  type: T, timeoutMs?: number,
  errorMsg: string = 'timeout'): Promise<NarrowMessage<T>> {
  
  return await Promise.race([waitMessage(connection, type), timeout(timeoutMs, errorMsg)])
}

export class PeerConnection extends EventEmitter<{ [K in type]: NarrowMessage<K> }> implements EventConnection {
  constructor (
    private readonly _ownId: NodeID,
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
      const msg: unknown = msgpack.decode(data)

      if (!decentralizedMessages.isPeerMessage(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      this.emit(msg.type, msg)
    })

    this.peer.on("close", () => {
      debug(`[${this._ownId}] peer ${this.peer.id} closed connection`);
    });

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
    this.peer.send(Buffer.from(msgpack.encode(msg)))
  }

  async disconnect(): Promise<void> {
    await this.peer.destroy()
  }
}

export class WebSocketServer extends EventEmitter<{ [K in type]: NarrowMessage<K> }> implements EventConnection {
  private constructor (
    private readonly socket: WebSocket.WebSocket,
    private readonly validateSent?: (msg: Message) => boolean
  ) { super() }

  static async connect (url: URL,
    validateReceived: (msg: unknown) => msg is Message,
    validateSent: (msg: Message) => boolean): Promise<WebSocketServer> {
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'

    const server: WebSocketServer = new WebSocketServer(ws, validateSent)

    ws.onmessage = (event: WebSocket.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }

      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      // Validate message format
      if (!validateReceived(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      server.emit(msg.type, msg)
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: WebSocket.ErrorEvent) => {
        reject(new Error(`Server unreachable: ${err.message}`))
      }
      ws.onopen = () => { resolve(server) }
    })
  }

  disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.onclose = () => resolve()
      this.socket.onerror = (e) => reject(e.message)
      this.socket.close()
    })
  }

  send (msg: Message): void {
    if (this.validateSent !== undefined && !this.validateSent(msg)) {
      throw new Error(`can't send this type of message: ${JSON.stringify(msg)}`)
    }

    this.socket.send(msgpack.encode(msg))
  }
}
