import createDebug from "debug";
import { Map, type Set } from 'immutable'

import { Peer, type SignalData } from './peer.js'
import { type NodeID } from '../types.js'
import { PeerConnection, type EventConnection } from '../event_connection.js'

const debug = createDebug("discojs:client:decentralized:pool");

// TODO cleanup old peers

export class PeerPool {
  private peers = Map<NodeID, PeerConnection>()

  constructor (
    private readonly id: NodeID
  ) {}

  async shutdown (): Promise<void> {
    debug(`[${this.id}] is shutting down all its connections`);

    // Add a timeout o.w. the promise hangs forever if the other peer is already disconnected
    await Promise.race([
      Promise.all(this.peers.valueSeq().map((peer) => peer.disconnect())),
      new Promise((res, _) => setTimeout(res, 1000)) // Wait for other peers to finish
    ])
    this.peers = Map()
  }

  signal (peerId: NodeID, signal: SignalData): void {
    debug(`[${this.id}] signals for %s`, peerId);

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

    debug(`[${this.id}] is connecting peers: %o`, peersToConnect.toArray());

    const newPeers = Map(
      peersToConnect
        .filter((id) => !this.peers.has(id))
        .map((id) => [id, new Peer(id, id < this.id)] as [string, Peer])
    )

    debug(`[${this.id}] asked to connect new peers: %o`, newPeers.keySeq().toArray());
    const newPeersConnections = newPeers.map((peer) => new PeerConnection(this.id, peer, signallingServer))

    // adding peers to pool before connecting them because they must be set to call signal on them
    this.peers = this.peers.merge(newPeersConnections)

    clientHandle(this.peers)

    await Promise.all(newPeersConnections.valueSeq().map((conn) => conn.connect()))
    debug(`[${this.id}] knowns connected peers: %o`, this.peers.keySeq().toArray())

    return this.peers
      .filter((_, id) => peersToConnect.has(id))
  }
}
