import { Map, type Set } from 'immutable'

import { Peer, type SignalData } from './peer.js'
import { type NodeID } from '../types.js'
import { PeerConnection, type EventConnection } from '../event_connection.js'

// TODO cleanup old peers

export class PeerPool {
  private peers = Map<NodeID, PeerConnection>()

  constructor (
    private readonly id: NodeID
  ) {}

  shutdown (): void {
    console.info(`[${this.id}] shutdown their peers`)

    this.peers.forEach((peer) => { peer.disconnect() })
    this.peers = Map()
  }

  signal (peerId: NodeID, signal: SignalData): void {
    console.info(`[${this.id}] signals for`, peerId)

    const peer = this.peers.get(peerId)
    if (peer === undefined) {
      throw new Error(`received signal for unknown peer: ${peerId}`)
    }

    peer.signal(signal)
  }

  async getPeers (
    peersToConnect: Set<NodeID>,
    signallingServer: EventConnection,
    // TODO as event?
    clientHandle: (connections: Map<NodeID, PeerConnection>) => void
  ): Promise<Map<NodeID, PeerConnection>> {
    if (peersToConnect.contains(this.id)) {
      throw new Error('peers to connect contains our id')
    }

    console.info(`[${this.id}] is connecting peers:`, peersToConnect.toJS())

    const newPeers = Map(await Promise.all(
      peersToConnect
        .filter((id) => !this.peers.has(id))
        .map(async (id) => [id, await Peer.init(id, id < this.id)] as [string, Peer])
        .toArray()
    ))

    console.info(`[${this.id}] asked to connect new peers:`, newPeers.keySeq().toJS())
    const newPeersConnections = newPeers.map((peer) => new PeerConnection(this.id, peer, signallingServer))

    // adding peers to pool before connecting them because they must be set to call signal on them
    this.peers = this.peers.merge(newPeersConnections)

    clientHandle(this.peers)

    await Promise.all(
      Array.from(newPeersConnections.values()).map(async (connection) => { await connection.connect() }))

    console.info(`[${this.id}] knowns connected peers:`, this.peers.keySeq().toJS())

    return this.peers
      .filter((_, id) => peersToConnect.has(id))
  }
}
