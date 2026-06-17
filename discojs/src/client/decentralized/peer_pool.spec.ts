import { Map, Range } from "immutable";
import { assert, afterEach, beforeEach, describe, it } from "vitest";

import type { EventConnection, PeerConnection } from "../event_connection.js";
import { type } from "../messages.js";
import type { NodeID } from "../types.js";

import type { messages } from "./index.js";
import { PeerPool } from "./peer_pool.js";

describe("peer pool", { timeout: 10_000 }, () => {
  let pools: Map<NodeID, PeerPool>;

  beforeEach(() => {
    const count = 3;

    pools = Map(
      Range(1, count + 1)
        .map(String)
        .map((id) => [id, new PeerPool(id)]),
    );
  });

  afterEach(async () => {
    await Promise.all(pools.valueSeq().map((p) => p.shutdown()));
  });

  function mockServer(poolId: string): EventConnection {
    return {
      send: (msg): void => {
        const signal = msg as messages.SignalForPeer;
        const otherPool = pools.get(signal.peer);
        if (otherPool === undefined) {
          throw new Error(`signal for unknown pool: ${signal.peer}`);
        }
        otherPool.signal(poolId, signal.signal);
      },
      on: (): void => {
        /* nothing */
      },
      once: (): void => {
        /* nothing */
      },
      disconnect: (): Promise<void> => Promise.resolve(),
    };
  }

  function mockWeights(id: NodeID): messages.Payload {
    return {
      type: type.Payload,
      peer: id,
      payload: Uint8Array.of(1, 2, 3),
      aggregationRound: 0,
      communicationRound: 0,
    };
  }

  async function getAllPeers(
    pools: Map<NodeID, PeerPool>,
  ): Promise<Map<NodeID, Map<NodeID, PeerConnection>>> {
    const ids = pools.keySeq().toSet();

    return Map(
      await Promise.all(
        pools
          .map(
            async (pool, poolID) =>
              await pool.getPeers(
                ids.remove(poolID),
                mockServer(poolID),
                () => {
                  // empty
                },
              ),
          )
          .entrySeq()
          .map(
            async ([id, p]) =>
              [id, await p] as [NodeID, Map<NodeID, PeerConnection>],
          )
          .toArray(),
      ),
    );
  }

  async function assertCanSendMessagesToEach(
    peersSets: Map<NodeID, Map<NodeID, PeerConnection>>,
  ): Promise<void> {
    const messages = peersSets
      .entrySeq()
      .map(([_, peers]) =>
        peers
          .keySeq()
          .map((id) => mockWeights(id))
          .toArray(),
      )
      .toArray()
      .flat();

    for (const [poolID, peers] of peersSets)
      for (const peer of peers.values()) peer.send(mockWeights(poolID));

    const exchanged = (
      await Promise.all(
        peersSets
          .valueSeq()
          .map(
            async (peers) =>
              await Promise.all(
                peers
                  .valueSeq()
                  .map(
                    async (peer) =>
                      await new Promise<messages.Payload>((resolve) => {
                        peer.on(type.Payload, (data) => {
                          resolve(data);
                        });
                      }),
                  )
                  .toArray(),
              ),
          )
          .toArray(),
      )
    ).flat();

    assert.sameDeepMembers(exchanged, messages);
  }

  it("gets peers to connect to", async () => {
    const poolsPeers = await getAllPeers(pools);
    await assertCanSendMessagesToEach(poolsPeers);
  });

  it("doesn't reconnect known peers", async () => {
    const poolsPeersFirst = await getAllPeers(pools);
    await assertCanSendMessagesToEach(poolsPeersFirst);

    const poolsPeersSecond = await getAllPeers(pools);
    await assertCanSendMessagesToEach(poolsPeersSecond);
  });
});
