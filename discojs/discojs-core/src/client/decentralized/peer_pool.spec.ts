import { assert } from 'chai'
import { Map, Range } from 'immutable'
import { type messages } from '.'
import { type } from '../messages'
import { type PeerConnection, type EventConnection } from '../event_connection'

import { PeerPool } from './peer_pool'
import { type NodeID } from '../types'

describe('peer pool', function () {
  this.timeout(10_000)

  let pools: Map<NodeID, PeerPool>

  beforeEach(async () => {
    const count = 3

    pools = Map(Range(1, count + 1).map(String).map((id) =>
      [id, new PeerPool(id)]
    ))
  })

  afterEach(() => {
    pools.forEach((p) => { p.shutdown() })
  })

  function mockServer (poolId: string): EventConnection {
    return {
      send: (msg: any): void => {
        const signal: messages.SignalForPeer = msg
        const otherPool = pools.get(signal.peer)
        if (otherPool === undefined) {
          throw new Error(`signal for unknown pool: ${signal.peer}`)
        }
        otherPool.signal(poolId, signal.signal)
      },
      on: (): void => {},
      once: (): void => {},
      disconnect: (): void => {}
    }
  }

  function mockWeights (id: NodeID): messages.Payload {
    return {
      type: type.Payload,
      peer: id,
      payload: [1, 2, 3],
      round: 0
    }
  }

  async function getAllPeers (pools: Map<NodeID, PeerPool>):
  Promise<Map<NodeID, Map<NodeID, PeerConnection>>> {
    const ids = pools.keySeq().toSet()

    return Map(await Promise.all(pools
      .map(async (pool, poolID) =>
        await pool.getPeers(ids.remove(poolID), mockServer(poolID), () => {})
      )
      .entrySeq()
      .map(async ([id, p]) =>
        [id, await p] as [NodeID, Map<NodeID, PeerConnection>]
      )
      .toArray()
    ))
  }

  async function assertCanSendMessagesToEach (
    peersSets: Map<NodeID, Map<NodeID, PeerConnection>>
  ): Promise<void> {
    const messages =
      peersSets
        .entrySeq()
        .map(([poolID, peers]) =>
          peers
            .keySeq().map((id) => mockWeights(id))
            .toArray())
        .toArray()
        .flat()

    peersSets
      .entrySeq()
      .forEach(([poolID, peers]) =>
        peers.forEach((peer, id) => { peer.send(mockWeights(poolID)) }))

    const exchanged = (await Promise.all(
      peersSets
        .valueSeq()
        .map(async (peers) => await Promise.all(
          peers
            .valueSeq()
            .map(async (peer) =>
              await new Promise<messages.Payload>((resolve) => { peer.on(type.Payload, (data) => { resolve(data) }) }
              )
            )
            .toArray()
        ))
        .toArray()
    )).flat()

    assert.sameDeepMembers(exchanged, messages)
  }

  it('gets peers to connect to', async () => {
    const poolsPeers = await getAllPeers(pools)
    await assertCanSendMessagesToEach(poolsPeers)
  })

  it('doesn\'t reconnect known peers', async () => {
    const poolsPeersFirst = await getAllPeers(pools)
    await assertCanSendMessagesToEach(poolsPeersFirst)

    const poolsPeersSecond = await getAllPeers(pools)
    await assertCanSendMessagesToEach(poolsPeersSecond)
  })
})
