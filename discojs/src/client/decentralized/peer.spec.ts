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
});
