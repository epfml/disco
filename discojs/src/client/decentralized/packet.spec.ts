import { assert, describe, it } from "vitest";
import { Packet } from "#client/decentralized/packet";

describe("packet", () => {
  it("encodes and decodes an ack packet", () => {
    const ack = Packet.ack(42);
    const encoded = ack.encode();
    const decoded = Packet.decode(encoded);

    assert.isTrue(decoded.isAck);
    assert.strictEqual(decoded.messageID, 42);
  });

  it("encodes and decodes a first chunk packet with 32-bit chunk counter and total count", () => {
    const payload = Buffer.from("hello world");
    const firstChunk = Packet.firstChunk(101, 500, payload);
    const encoded = firstChunk.encode();
    const decoded = Packet.decode(encoded);

    assert.isTrue(decoded.isFirstChunk);
    assert.strictEqual(decoded.messageID, 101);
    assert.strictEqual(decoded.chunkID, 0);
    assert.strictEqual(decoded.totalChunks, 500);
    assert.strictEqual(decoded.payload.toString(), "hello world");
  });

  it("encodes and decodes a subsequent chunk packet", () => {
    const payload = Buffer.from("subsequent chunk");
    const chunk = Packet.chunk(101, 299, payload);
    const encoded = chunk.encode();
    const decoded = Packet.decode(encoded);

    assert.isFalse(decoded.isAck);
    assert.isFalse(decoded.isFirstChunk);
    assert.strictEqual(decoded.messageID, 101);
    assert.strictEqual(decoded.chunkID, 299);
    assert.strictEqual(decoded.payload.toString(), "subsequent chunk");
  });

  it("rejects invalid buffer sizes on decode", () => {
    assert.throws(() => Packet.decode(Buffer.alloc(2)));
  });
});
