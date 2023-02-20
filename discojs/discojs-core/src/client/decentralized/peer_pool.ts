import { Map, Set } from 'immutable'
import { SignalData } from 'simple-peer'
import { WRTC } from '@koush/wrtc'

import { Peer } from './peer'
import { PeerID } from './types'
import { PeerConnection, EventConnection } from '../event_connection'

// TODO cleanup old peers

export class PeerPool {
  private peers = Map<PeerID, PeerConnection>()

  private constructor (
    private readonly id: PeerID,
    private readonly wrtc?: WRTC
  ) {}

  static async init (id: PeerID): Promise<PeerPool> {
    // needed on node
    let wrtc: WRTC | undefined
    try {
      // resolve relatively to where it is run, not from discojs dir
      const path = require.resolve('@koush/wrtc', { paths: ['.'] })
      wrtc = await import(path)
    } catch (e) {
      // expected
    }

    return new PeerPool(id, wrtc)
  }

  shutdown (): void {
    console.debug(this.id, 'shutdown their peers')

    this.peers.forEach((peer) => { peer.disconnect() })
    this.peers = Map()
  }

  signal (peerID: PeerID, signal: SignalData): void {
    console.debug(this.id, 'signals for', peerID)

    const peer = this.peers.get(peerID)
    if (peer === undefined) {
      throw new Error(`received signal for unknown peer: ${peerID}`)
    }

    peer.signal(signal)
  }

  async getPeers (
    peersToConnect: Set<PeerID>,
    signallingServer: EventConnection,
    // TODO as event?
    clientHandle: (connections: Map<PeerID, PeerConnection>) => void
  ): Promise<Map<PeerID, PeerConnection>> {
    if (peersToConnect.contains(this.id)) {
      throw new Error('peers to connect contains our id')
    }

    console.debug(this.id, 'is connecting peers:', peersToConnect.toJS())

    const newPeers = Map(peersToConnect
      .filter((id) => !this.peers.has(id))
      .map((id) => [id, id < this.id] as [number, boolean])
      .map(([id, initiator]) => {
        const p = new Peer(id, { initiator, wrtc: this.wrtc })
        // onNewPeer(id, p)
        return [id, p]
      }))

    console.debug(this.id, 'asked to connect new peers:', newPeers.keySeq().toJS())
    const newPeersConnections = newPeers.map((peer, id) => new PeerConnection(this.id, peer, signallingServer))

    // adding peers to pool before connecting them because they must be set to call signal on them
    this.peers = this.peers.merge(newPeersConnections)

    clientHandle(this.peers)

    await Promise.all(
      Array.from(newPeersConnections.values()).map(async (connection) => { await connection.connect() }))

    console.debug(this.id, 'knowns connected peers:', this.peers.keySeq().toJS())

    return this.peers
      .filter((_, id) => peersToConnect.has(id))
  }
}
