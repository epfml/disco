import { List, Map, Range, Seq, Set } from "immutable";
import wrtc from "@epfml/isomorphic-wrtc";

import type { NodeID } from "#client/types";
import { EventEmitter } from "#utils/event_emitter";

type MessageID = number;
type ChunkID = number;

// message id (2 bytes) + chunk counter (4 bytes) + total chunk count (4 bytes)
const FIRST_HEADER_SIZE = 2 + 4 + 4;

// message id (2 bytes) + chunk counter (4 bytes)
const HEADER_SIZE = 2 + 4;

// chunk counter of an acknowledgement, unused by messages
const ACK_CHUNK_ID = 0xffff_ffff;

// at which interval to poll
const TICK = 10;

// how long to wait for sent messages to be received before giving up
const MAX_DRAIN_TIME = 10_000;

// Maximum safe SCTP message size supported across browsers (Chrome/Firefox/Node)
const MAX_TRANSPORT_MESSAGE_SIZE = 262_144; // 256 KiB

// we can't use the definition in DOM as we're platform independent
export type SignalData =
  | { type: "answer" | "offer" | "pranswer" | "rollback"; sdp?: string }
  | { type: "transceiverRequest"; transceiverRequest: { kind: string } }
  | { type: "renegotiate"; renegotiate: true }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

type EventPayloads = {
  close: void;
  connect: void;
  error: Error;
  signal: SignalData;
  data: Buffer;
  [key: string]: unknown;
};

// Peer adds message fragmentation, flow control, and receipt acknowledgements
// over standard WebRTC RTCPeerConnection and RTCDataChannel.
//
// WebRTC implementations have various maximum message sizes (e.g. 256 KiB in Chromium).
// For large models (megabytes to gigabytes), messages are split into chunks
// and reconstructed on the receiving peer.
//
// As the WebRTC DataChannel is not a stream, we frame each chunk with a message ID,
// chunk counter, and total chunk count. Once a message is fully received, its ID is sent back
// with ACK_CHUNK_ID so the sender can drain before closing the connection.
export class Peer extends EventEmitter<EventPayloads> {
  private readonly pc: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private isDestroyed = false;
  private signalQueue = Promise.resolve();
  private queuedCandidates: RTCIceCandidateInit[] = [];
  private remoteMaxMessageSize?: number;

  private sendCounter: MessageID = 0;
  private sendQueue = List<Buffer>();
  private unacknowledged = Set<MessageID>();

  private receiving = Map<
    MessageID,
    {
      total?: number;
      chunks: Map<ChunkID, Buffer>;
    }
  >();

  constructor(
    public readonly id: NodeID,
    initiator: boolean = false,
  ) {
    super();

    this.pc = new wrtc.RTCPeerConnection();

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate: RTCIceCandidateInit = event.candidate.toJSON
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment,
            };
        this.emit("signal", { type: "candidate", candidate });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (
        this.pc.connectionState === "failed" ||
        this.pc.connectionState === "closed"
      ) {
        this.emit("close", undefined);
      }
    };

    if (initiator) {
      const channel = this.pc.createDataChannel("disco");
      this.setupChannel(channel);
      queueMicrotask(() => {
        void this.makeOffer();
      });
    } else {
      this.pc.ondatachannel = (event) => {
        this.setupChannel(event.channel);
      };
    }
  }

  private setupChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    this.channel.binaryType = "arraybuffer";
    try {
      this.channel.bufferedAmountLowThreshold = MAX_TRANSPORT_MESSAGE_SIZE;
    } catch {
      // Some WebRTC implementations may not support bufferedAmountLowThreshold
    }

    this.channel.onopen = () => {
      this.emit("connect", undefined);
      this.flush();
    };

    this.channel.onmessage = (event: MessageEvent) => {
      const data = Buffer.isBuffer(event.data)
        ? event.data
        : Buffer.from(event.data as ArrayBuffer);
      this.handleData(data);
    };

    this.channel.onbufferedamountlow = () => {
      this.flush();
    };

    this.channel.onclose = () => {
      this.emit("close", undefined);
    };

    this.channel.onerror = (event) => {
      const message =
        "error" in event && event.error instanceof Error
          ? event.error.message
          : "DataChannel error";
      this.emit("error", new Error(message));
    };
  }

  private async makeOffer(): Promise<void> {
    if (this.isDestroyed) return;
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.emit("signal", {
        type: "offer",
        sdp: offer.sdp,
      });
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  }

  signal(signal: SignalData): void {
    this.signalQueue = this.signalQueue
      .then(() => this.handleSignal(signal))
      .catch((err) => {
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
      });
  }

  private async handleSignal(signal: SignalData): Promise<void> {
    if (this.isDestroyed) return;

    if (signal.type === "offer") {
      if (signal.sdp === undefined) {
        throw new Error("signal offer without session description");
      }
      this.extractMaxMessageSize(signal.sdp);
      await this.pc.setRemoteDescription(
        new wrtc.RTCSessionDescription({ type: "offer", sdp: signal.sdp }),
      );
      await this.drainQueuedCandidates();
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.emit("signal", {
        type: "answer",
        sdp: answer.sdp,
      });
    } else if (signal.type === "answer") {
      if (signal.sdp === undefined) {
        throw new Error("signal answer without session description");
      }
      this.extractMaxMessageSize(signal.sdp);
      await this.pc.setRemoteDescription(
        new wrtc.RTCSessionDescription({ type: "answer", sdp: signal.sdp }),
      );
      await this.drainQueuedCandidates();
    } else if (signal.type === "candidate") {
      if (!signal.candidate) return;
      if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
        await this.pc.addIceCandidate(
          new wrtc.RTCIceCandidate(signal.candidate),
        );
      } else {
        this.queuedCandidates.push(signal.candidate);
      }
    }
  }

  private extractMaxMessageSize(sdp: string): void {
    const match = sdp.match(/a=max-message-size:(\d+)/);
    if (match !== null) {
      const max = parseInt(match[1], 10);
      if (!isNaN(max)) {
        this.remoteMaxMessageSize = max;
      }
    }
  }

  private async drainQueuedCandidates(): Promise<void> {
    for (const c of this.queuedCandidates) {
      try {
        await this.pc.addIceCandidate(new wrtc.RTCIceCandidate(c));
      } catch {
        // Ignore candidate errors if transport already connected
      }
    }
    this.queuedCandidates = [];
  }

  send(msg: Buffer): void {
    const messageID = this.sendCounter;
    const chunks = this.chunk(msg);
    this.unacknowledged = this.unacknowledged.add(messageID);
    this.sendQueue = this.sendQueue.concat(chunks);
    this.flush();
  }

  private acknowledge(messageID: MessageID): void {
    const ack = Buffer.alloc(HEADER_SIZE);
    ack.writeUInt16BE(messageID, 0);
    ack.writeUInt32BE(ACK_CHUNK_ID, 2);
    this.sendQueue = this.sendQueue.push(ack);
    this.flush();
  }

  private flush(): void {
    if (
      this.isDestroyed ||
      !this.channel ||
      this.channel.readyState !== "open"
    ) {
      return;
    }

    const HIGH_WATER_MARK = 1024 * 1024; // 1 MB queue backpressure cap

    while (!this.sendQueue.isEmpty()) {
      if (this.channel.bufferedAmount >= HIGH_WATER_MARK) {
        setTimeout(() => this.flush(), TICK);
        return;
      }

      const chunk = this.sendQueue.first();
      if (chunk === undefined) break;

      this.sendQueue = this.sendQueue.shift();
      try {
        (this.channel.send as (data: unknown) => void)(chunk);
      } catch (err) {
        this.emit(
          "error",
          err instanceof Error ? err : new Error("Failed to send chunk"),
        );
        return;
      }
    }
  }

  get maxChunkSize(): number {
    // 1. Built-in RTCSctpTransport.maxMessageSize from the active connection
    const sctpLimit = this.pc.sctp?.maxMessageSize;
    if (
      typeof sctpLimit === "number" &&
      sctpLimit > 0 &&
      Number.isFinite(sctpLimit)
    ) {
      // Chromium send limit is 256 KiB (262,144 bytes).
      // Even if remote peer (like Firefox) advertises 1 GiB, cap at 256 KiB for universal cross-browser reliability.
      return Math.min(sctpLimit, MAX_TRANSPORT_MESSAGE_SIZE);
    }

    // 2. Fallback to remote SDP if extracted
    if (this.remoteMaxMessageSize !== undefined) {
      return Math.min(this.remoteMaxMessageSize, MAX_TRANSPORT_MESSAGE_SIZE);
    }

    // 3. Safe universal default (256 KiB)
    return MAX_TRANSPORT_MESSAGE_SIZE;
  }

  private chunk(b: Buffer): Seq.Indexed<Buffer> {
    const messageID = this.sendCounter;
    this.sendCounter++;
    if (this.sendCounter > 0xffff) {
      throw new Error("too many messages sent to this peer");
    }

    let tail = Seq.Indexed<Buffer>([]);
    if (b.length > this.maxChunkSize - FIRST_HEADER_SIZE) {
      tail = Range(
        this.maxChunkSize - FIRST_HEADER_SIZE,
        b.length,
        this.maxChunkSize - HEADER_SIZE,
      ).map((offset) =>
        b.subarray(offset, offset + this.maxChunkSize - HEADER_SIZE),
      );
    }

    const totalChunkCount = 1 + tail.count();
    if (totalChunkCount >= ACK_CHUNK_ID) {
      throw new Error(
        `The payload is too big: ${totalChunkCount} chunks exceeds max chunks (${ACK_CHUNK_ID})`,
      );
    }

    const firstChunk = Buffer.alloc(
      b.length > this.maxChunkSize - FIRST_HEADER_SIZE
        ? this.maxChunkSize
        : FIRST_HEADER_SIZE + b.length,
    );
    firstChunk.writeUInt16BE(messageID, 0);
    firstChunk.writeUInt32BE(0, 2);
    firstChunk.writeUInt32BE(totalChunkCount, 6);
    b.copy(
      firstChunk,
      FIRST_HEADER_SIZE,
      0,
      this.maxChunkSize - FIRST_HEADER_SIZE,
    );

    return Seq.Indexed([firstChunk]).concat(
      Range(1, Number.POSITIVE_INFINITY)
        .zip(tail)
        .map(([id, raw]) => {
          const chunk = Buffer.alloc(HEADER_SIZE + raw.length);
          chunk.writeUInt16BE(messageID, 0);
          chunk.writeUInt32BE(id, 2);
          raw.copy(chunk, HEADER_SIZE, 0);
          return chunk;
        }),
    );
  }

  // Resolves once every message sent so far has been received,
  // as destroying the peer drops whatever is still in transit.
  // Gives up after a while in case the other peer is gone.
  async drain(): Promise<void> {
    const deadline = Date.now() + MAX_DRAIN_TIME;
    while (
      !this.isDestroyed &&
      !this.unacknowledged.isEmpty() &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, TICK));
    }
  }

  async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    try {
      if (this.channel) {
        this.channel.close();
      }
      this.pc.close();
    } catch {
      // Ignore closing errors
    }

    this.emit("close", undefined);
    await Promise.resolve();
  }

  private handleData(data: Buffer): void {
    if (!Buffer.isBuffer(data) || data.length < HEADER_SIZE) {
      throw new Error("received invalid message type");
    }
    const messageID: MessageID = data.readUInt16BE(0);
    const chunkID: ChunkID = data.readUInt32BE(2);
    if (chunkID === ACK_CHUNK_ID) {
      this.unacknowledged = this.unacknowledged.delete(messageID);
      return;
    }

    const received = this.receiving.get(messageID, {
      total: undefined,
      chunks: Map<ChunkID, Buffer>(),
    });
    let total = received.total;
    const chunks = received.chunks;

    if (chunks.has(chunkID)) {
      throw new Error(`chunk ${messageID}:${chunkID} already received`);
    }

    let chunk: Buffer;
    if (chunkID !== 0) {
      chunk = Buffer.alloc(data.length - HEADER_SIZE);
      data.copy(chunk, 0, HEADER_SIZE);
    } else {
      if (data.length < FIRST_HEADER_SIZE) {
        throw new Error("received invalid message type");
      }
      if (total !== undefined) {
        throw new Error("first header received twice");
      }

      const readTotal = data.readUInt32BE(6);
      total = readTotal;
      chunk = Buffer.alloc(data.length - FIRST_HEADER_SIZE);
      data.copy(chunk, 0, FIRST_HEADER_SIZE);

      if (chunks.keySeq().some((id) => id >= readTotal)) {
        throw new Error(
          "received total of chunk but got now-out-of-bound chunks",
        );
      }
    }
    this.receiving = this.receiving.set(messageID, {
      total,
      chunks: chunks.set(chunkID, chunk),
    });

    const readyMessages = this.receiving
      .filter(
        ({ total, chunks }) => total !== undefined && chunks.size === total,
      )
      .sort()
      .map(({ chunks }) =>
        chunks
          .entrySeq()
          .toList()
          .sortBy(([id]) => id),
      )
      .map((chunks) => Buffer.concat(chunks.map(([_, b]) => b).toArray()));
    this.receiving = this.receiving.deleteAll(readyMessages.keys());

    readyMessages.forEach((message, messageID) => {
      this.acknowledge(messageID);
      this.emit("data", message);
    });
  }
}
