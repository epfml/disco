import { List, Range, Set } from "immutable";
import { assert, afterEach, beforeEach, describe, it } from "vitest";
import { Peer } from "#client/decentralized/peer";

describe("peer", () => {
  let peer1: Peer;
  let peer2: Peer;

  beforeEach(async () => {
    peer1 = new Peer("1");
    peer2 = new Peer("2", true);
    const peers = Set.of(peer1, peer2);

    peer1.on("signal", (signal) => {
      peer2.signal(signal);
    });
    peer2.on("signal", (signal) => {
      peer1.signal(signal);
    });

    await Promise.all(
      peers
        .map(async (peer) => {
          await new Promise<void>((resolve) => {
            peer.on("connect", resolve);
          });
        })
        .toArray(),
    );
  });

  afterEach(async () => {
    await Promise.all([peer1.destroy(), peer2.destroy()]);
  });

  it("can send and receives a message", async () => {
    const message = "small message";

    peer1.send(Buffer.from(message));
    const received = await new Promise((resolve) => {
      peer2.on("data", (msg) => {
        resolve(msg.toString());
      });
    });

    assert.strictEqual(received, message);
  });

  it("can send and receives multiple messages", async () => {
    const messages = Range(0, 5).map((i) => `message ${i}`);

    for (const m of messages) peer1.send(Buffer.from(m));

    const receiveds: List<string> = await new Promise((resolve) => {
      let buffer = List<string>();
      peer2.on("data", (data) => {
        buffer = buffer.push(data.toString());
        if (buffer.size === messages.size) {
          resolve(buffer);
        }
      });
    });

    assert.deepStrictEqual(receiveds.toArray(), messages.toArray());
  });

  it("drains once the other peer received the message", async () => {
    // big enough to be split into chunks and still in transit
    // after leaving the data channel's buffer
    const message = Buffer.alloc(4 * 1024 * 1024);
    let received = false;
    peer2.on("data", () => {
      received = true;
    });

    peer1.send(message);
    await peer1.drain();

    assert.isTrue(received);
  });

  it("transfers GPT-sized payload with byte-for-byte reassembly", async () => {
    // 10 MB buffer simulating GPT weights
    const size = 10 * 1024 * 1024;
    const message = Buffer.alloc(size);
    // Fill with non-trivial pattern to thoroughly verify byte ordering
    for (let i = 0; i < size; i += 4) {
      message.writeUInt32LE((i * 1103515245 + 12345) >>> 0, i);
    }

    const receivedPromise = new Promise<Buffer>((resolve) => {
      peer2.on("data", (data) => resolve(data));
    });

    peer1.send(message);
    await peer1.drain();
    const received = await receivedPromise;

    assert.strictEqual(received.length, message.length);
    assert.strictEqual(Buffer.compare(received, message), 0);
  });

  it("handles payloads with more than 255 chunks", async () => {
    // Override maxChunkSize to small size (1024 bytes) to test >255 chunk count boundary
    Object.defineProperty(peer1, "maxChunkSize", { get: () => 1024 });

    // 300 chunks
    const size = 300 * 1024;
    const message = Buffer.alloc(size);
    for (let i = 0; i < size; i += 4) {
      message.writeUInt32LE((i * 1664525 + 1013904223) >>> 0, i);
    }

    const receivedPromise = new Promise<Buffer>((resolve) => {
      peer2.on("data", (data) => resolve(data));
    });

    peer1.send(message);
    await peer1.drain();
    const received = await receivedPromise;

    assert.strictEqual(received.length, message.length);
    assert.strictEqual(Buffer.compare(received, message), 0);
  });
});
