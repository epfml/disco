export type MessageID = number;
export type ChunkID = number;

// helper function to make it evident that the number passed is a chunk id
export const asChunkID = (n: number): ChunkID => n;

// message id size in bytes (uint16)
export const MESSAGE_ID_BYTES = 2;
// chunk counter size in bytes (uint32)
export const CHUNK_ID_BYTES = 4;
// total chunk count size in bytes (uint32)
export const TOTAL_CHUNKS_BYTES = 4;

// message id (2 bytes) + chunk counter (4 bytes)
export const HEADER_SIZE = MESSAGE_ID_BYTES + CHUNK_ID_BYTES;

// message id (2 bytes) + chunk counter (4 bytes) + total chunk count (4 bytes)
export const FIRST_HEADER_SIZE = HEADER_SIZE + TOTAL_CHUNKS_BYTES;

// chunk counter of an acknowledgement, unused by messages
export const ACK_CHUNK_ID: ChunkID = 0xffff_ffff;

export class Packet {
  constructor(
    public readonly messageID: MessageID,
    public readonly chunkID: ChunkID,
    public readonly totalChunks?: number,
    public readonly payload: Buffer = Buffer.alloc(0),
  ) {}

  get isAck(): boolean {
    return this.chunkID === ACK_CHUNK_ID;
  }

  get isFirstChunk(): boolean {
    return this.chunkID === asChunkID(0);
  }

  static ack(messageID: MessageID): Packet {
    return new Packet(messageID, ACK_CHUNK_ID);
  }

  static firstChunk(
    messageID: MessageID,
    totalChunks: number,
    payload: Buffer,
  ): Packet {
    return new Packet(messageID, asChunkID(0), totalChunks, payload);
  }

  static chunk(
    messageID: MessageID,
    chunkID: ChunkID,
    payload: Buffer,
  ): Packet {
    return new Packet(messageID, chunkID, undefined, payload);
  }

  encode(): Buffer {
    if (this.isAck) {
      const buf = Buffer.alloc(HEADER_SIZE);
      buf.writeUInt16BE(this.messageID, 0);
      buf.writeUInt32BE(ACK_CHUNK_ID, MESSAGE_ID_BYTES);
      return buf;
    }

    if (this.isFirstChunk) {
      if (this.totalChunks === undefined) {
        throw new Error("first chunk packet requires totalChunks");
      }
      const buf = Buffer.alloc(FIRST_HEADER_SIZE + this.payload.length);
      buf.writeUInt16BE(this.messageID, 0);
      buf.writeUInt32BE(asChunkID(0), MESSAGE_ID_BYTES);
      buf.writeUInt32BE(this.totalChunks, HEADER_SIZE);
      this.payload.copy(buf, FIRST_HEADER_SIZE, 0);
      return buf;
    }

    const buf = Buffer.alloc(HEADER_SIZE + this.payload.length);
    buf.writeUInt16BE(this.messageID, 0);
    buf.writeUInt32BE(this.chunkID, MESSAGE_ID_BYTES);
    this.payload.copy(buf, HEADER_SIZE, 0);
    return buf;
  }

  static decode(data: Buffer): Packet {
    if (!Buffer.isBuffer(data) || data.length < HEADER_SIZE) {
      throw new Error("received invalid message type");
    }

    const messageID: MessageID = data.readUInt16BE(0);
    const chunkID: ChunkID = data.readUInt32BE(MESSAGE_ID_BYTES);

    if (chunkID === ACK_CHUNK_ID) {
      return Packet.ack(messageID);
    }

    if (chunkID === asChunkID(0)) {
      if (data.length < FIRST_HEADER_SIZE) {
        throw new Error("received invalid message type");
      }
      const totalChunks = data.readUInt32BE(HEADER_SIZE);
      const payload = Buffer.alloc(data.length - FIRST_HEADER_SIZE);
      data.copy(payload, 0, FIRST_HEADER_SIZE);
      return Packet.firstChunk(messageID, totalChunks, payload);
    }

    const payload = Buffer.alloc(data.length - HEADER_SIZE);
    data.copy(payload, 0, HEADER_SIZE);
    return Packet.chunk(messageID, chunkID, payload);
  }
}
