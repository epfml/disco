import { assert } from 'chai'
import { Map, Range } from 'immutable'
import SimplePeer from 'simple-peer'

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

  async function getAllPeers (pools: Map<PeerID, PeerPool>):
  Promise<Map<PeerID, Map<PeerID, SimplePeer.Instance>>> {
    const ids = pools.keySeq().toSet()

    return Map(await Promise.all(pools
      .map(async (pool, poolID) =>
        await pool.getPeers(ids.remove(poolID), (id, peer) => {
          peer.on('signal', (signal) => {
            const otherPool = pools.get(id)
            if (otherPool === undefined) {
              throw new Error(`signal for unknown pool: ${id}`)
            }
            otherPool.signal(poolID, signal)
          })
        })
      )
      .entrySeq()
      .map(async ([id, p]) =>
        [id, await p] as [PeerID, Map<PeerID, SimplePeer.Instance>]
      )
      .toArray()
    ))
  }

  async function assertCanSendMessagesToEach (
    peersSets: Map<PeerID, Map<PeerID, SimplePeer.Instance>>
  ): Promise<void> {
    const messages =
      peersSets
        .entrySeq()
        .map(([poolID, peers]) =>
          peers
            .keySeq().map((id) => `${poolID}->${id}`)
            .toArray())
        .toArray()
        .flat()
    messages.sort()

    peersSets
      .entrySeq()
      .forEach(([poolID, peers]) =>
        peers.forEach((peer, id) =>
          peer.send(`${poolID}->${id}`)))

    const exchanged = (await Promise.all(
      peersSets
        .valueSeq()
        .map(async (peers) => await Promise.all(
          peers
            .valueSeq()
            .map(async (peer) =>
              await new Promise<string>((resolve) =>
                peer.on('data', (data) => resolve(data.toString()))
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
