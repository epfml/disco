import { assert } from 'chai'
import { Map, Range } from 'immutable'
import { messages } from '.'
import { type } from '../messages'
import { PeerConnection, EventConnection } from '../event_connection'

import { Peer } from './peer'
import { PeerPool } from './peer_pool'
import { PeerID } from './types'

describe('peer pool', function () {
  this.timeout(10_000)

  let pools: Map<PeerID, PeerPool>

  beforeEach(async () => {
    const count = 3

    pools = Map(await Promise.all(
      Range(1, count + 1).map(async (id) =>
        [id, await PeerPool.init(id)] as [PeerID, PeerPool]
      ).toArray()
    ))
  })

  afterEach(() => {
    pools.forEach((p) => p.shutdown())
  })

  function mockServer(poolId: number): EventConnection {
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
    };
  }

  function mockWeights(id: PeerID): messages.Weights {
    return {
      type: type.Weights,
      peer: id,
      weights: [1, 2, 3]
    }
  }

  async function getAllPeers (pools: Map<PeerID, PeerPool>):
  Promise<Map<PeerID, Map<PeerID, PeerConnection>>> {
    const ids = pools.keySeq().toSet()

    return Map(await Promise.all(pools
      .map(async (pool, poolID) =>
        await pool.getPeers(ids.remove(poolID), mockServer(poolID), () => {})
      )
      .entrySeq()
      .map(async ([id, p]) =>
        [id, await p] as [PeerID, Map<PeerID, PeerConnection>]
      )
      .toArray()
    ))
  }

  async function assertCanSendMessagesToEach (
    peersSets: Map<PeerID, Map<PeerID, PeerConnection>>
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
    messages.sort()

    peersSets
      .entrySeq()
      .forEach(([poolID, peers]) =>
        peers.forEach((peer, id) =>
          peer.send(mockWeights(poolID))))

    const exchanged = (await Promise.all(
      peersSets
        .valueSeq()
        .map(async (peers) => await Promise.all(
          peers
            .valueSeq()
            .map(async (peer) =>
              await new Promise<messages.Weights>((resolve) =>
                peer.on(type.Weights, (data) => resolve(data))
              )
            )
            .toArray()
        ))
        .toArray()
    )).flat()
    exchanged.sort()

    assert.deepStrictEqual(exchanged, messages)
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
