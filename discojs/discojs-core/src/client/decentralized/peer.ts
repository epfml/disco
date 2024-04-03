import { List, Map, Range, Seq } from 'immutable'
import SimplePeer from 'simple-peer'

import type { NodeID } from '../types.js'

type MessageID = number
type ChunkID = number

// message id + (chunk counter == 0) + chunk count
const FIRST_HEADER_SIZE = 2 + 1 + 1

// message id + chunk counter
const HEADER_SIZE = 2 + 1

// at which interval to poll
const TICK = 10

// we can't use the definition in DOM as we're platform independent
export type SignalData =
  | { type: 'answer' | 'offer' | 'pranswer' | 'rollback', sdp?: string }
  | { type: 'transceiverRequest', transceiverRequest: { kind: string } }
  | { type: 'renegotiate', renegotiate: true }
  | { type: 'candidate', candidate: RTCIceCandidate }

interface Events {
  'close': () => void
  'connect': () => void
  'signal': (signal: SignalData) => void
  'data': (data: Buffer) => void
}

// Peer wraps a SimplePeer, adding message fragmentation
//
// WebRTC implementations have various maximum message size
// but with huge models, our messages might be bigger.
// We split messages by chunks and reconstruct these
// on the other side.
//
// As the WebRTC's DataChannel is not a stream, we need
// reorder messages, so we use a header on each chunk
// with a message id and chunk counter. The first chunk
// (chunk counter == 0), also add the total number of chunk.
//
// see feross/simple-peer#393 for more info
export class Peer {
  private bufferSize?: number

  private sendCounter: MessageID = 0
  private sendQueue = List<Buffer>()

  private receiving = Map<MessageID, {
    total?: number
    chunks: Map<ChunkID, Buffer>
  }>()

  private constructor (
    public readonly id: NodeID,
    private readonly peer: SimplePeer.Instance
  ) {}

  static async init (id: NodeID, initiator: boolean = false): Promise<Peer> {
    return new Peer(
      id,
      new SimplePeer({ wrtc: (await import('isomorphic-wrtc')).default, initiator })
    )
  }

  send (msg: Buffer): void {
    const chunks = this.chunk(msg)
    this.sendQueue = this.sendQueue.concat(chunks)
    this.flush()
  }

  private flush (): void {
    if (this.bufferSize === undefined) {
      throw new Error('flush without known buffer size')
    }

    const chunk = this.sendQueue.first()
    if (chunk === undefined) {
      return // nothing to flush
    }

    const remainingBufferSize = this.bufferSize - this.peer.bufferSize
    if (chunk.length > remainingBufferSize) {
      setTimeout(() => { this.flush() }, TICK)
      return
    }

    this.sendQueue = this.sendQueue.shift()
    this.peer.send(chunk)

    // and loop
    this.flush()
  }

  get maxChunkSize (): number {
    if (this.bufferSize === undefined) {
      throw new Error('chunk without known buffer size')
    }

    // in the perfect world of bug-free implementations
    // we would return this.bufferSize
    // sadly, we are not there yet
    //
    // based on MDN, taking 16K seems to be a pretty safe
    // and widely supported buffer size

    return 16 * (1 << 10)
  }

  private chunk (b: Buffer): Seq.Indexed<Buffer> {
    const messageID = this.sendCounter
    this.sendCounter++
    if (this.sendCounter > 0xFFFF) {
      throw new Error('too much messages sent to this peer')
    }

    // special case as Range(1, 0) yields a value
    let tail = Seq.Indexed<Buffer>([])
    if (b.length > this.maxChunkSize) {
      tail = Range(
        this.maxChunkSize - FIRST_HEADER_SIZE,
        b.length,
        this.maxChunkSize - HEADER_SIZE
      ).map((offset) => b.subarray(
        offset,
        offset + this.maxChunkSize - HEADER_SIZE
      ))
    }

    const totalChunkCount = 1 + tail.count()
    if (totalChunkCount > 0xFF) {
      throw new Error('too big message to even chunk it')
    }

    const firstChunk = Buffer.alloc(
      (b.length > this.maxChunkSize - FIRST_HEADER_SIZE)
        ? this.maxChunkSize
        : FIRST_HEADER_SIZE + b.length
    )
    firstChunk.writeUint16BE(messageID)
    firstChunk.writeUint8(0 as ChunkID, 2)
    firstChunk.writeUint8(totalChunkCount, 3)
    b.copy(firstChunk, FIRST_HEADER_SIZE, 0, this.maxChunkSize - FIRST_HEADER_SIZE)

    return Seq.Indexed([firstChunk])
      .concat(
        Range(1 as ChunkID).zip(tail)
          .map(([id, raw]) => {
            const chunk = Buffer.alloc(HEADER_SIZE + raw.length)
            chunk.writeUint16BE(messageID)
            chunk.writeUint8(id, 2)
            raw.copy(chunk, HEADER_SIZE, 0)
            return chunk
          })
      )
  }

  async destroy (): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer.once('error', reject)
      this.peer.once('close', resolve)
      this.peer.destroy()
    })
  }

  signal (signal: SignalData): void {
    // extract max buffer size
    if (signal.type === 'offer' || signal.type === 'answer') {
      if (signal.sdp === undefined) {
        throw new Error('signal answer|offer without session description')
      }
      if (this.bufferSize !== undefined) {
        throw new Error('buffer size set twice')
      }

      const match = signal.sdp.match(/a=max-message-size:(\d+)/)
      if (match === null) {
        // TODO default value instead?
        throw new Error('no max-message-size found in signal')
      }
      const max = parseInt(match[1], 10)
      if (isNaN(max)) {
        throw new Error(`unable to parse max-message-size as int: ${match[1]}`)
      }

      this.bufferSize = max
    }

    this.peer.signal(signal)
  }

  on<K extends keyof Events>(event: K, listener: Events[K]): void {
    if (event !== 'data') {
      this.peer.on(event, listener)
      return
    }
    // gotta help typescript here
    const dataListener = listener as Events['data']

    this.peer.on('data', (data: unknown) => {
      if (!Buffer.isBuffer(data) || data.length < HEADER_SIZE) {
        throw new Error('received invalid message type')
      }

      const messageID: MessageID = data.readUint16BE()
      const chunkID: ChunkID = data.readUint8(2)

      const received = this.receiving.get(messageID, {
        total: undefined,
        chunks: Map<ChunkID, Buffer>()
      })
      let total = received.total
      const chunks = received.chunks

      if (chunks.has(chunkID)) {
        throw new Error(`chunk ${messageID}:${chunkID} already received`)
      }

      let chunk: Buffer
      if (chunkID !== 0) {
        chunk = Buffer.alloc(data.length - HEADER_SIZE)
        data.copy(chunk, 0, HEADER_SIZE)
      } else {
        if (data.length < FIRST_HEADER_SIZE) {
          throw new Error('received invalid message type')
        }
        if (total !== undefined) {
          throw new Error('first header received twice')
        }

        const readTotal = data.readUint8(3)
        total = readTotal
        chunk = Buffer.alloc(data.length - FIRST_HEADER_SIZE)
        data.copy(chunk, 0, FIRST_HEADER_SIZE)

        if (chunks.keySeq().some((id) => id > readTotal)) {
          throw new Error('received total of chunk but got now-out-of-bound chunks')
        }
      }
      this.receiving = this.receiving.set(messageID, {
        total,
        chunks: chunks.set(chunkID, chunk)
      })

      const readyMessages = this.receiving
        .filter(({ total, chunks }) => total !== undefined && chunks.size === total)
        .sort()
        .map(({ chunks }) => chunks.entrySeq().toList().sortBy(([id, _]) => id))
        .map((chunks) => Buffer.concat(chunks.map(([_, b]) => b).toArray()))
      this.receiving = this.receiving.deleteAll(readyMessages.keys())

      readyMessages
        .forEach((message) => {
          // TODO debug
          dataListener(message)
        })
    })
  }
}
