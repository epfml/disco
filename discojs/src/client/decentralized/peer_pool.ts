import createDebug from "debug";
import { Map, type Set, List } from "immutable";

import { Peer, type SignalData } from "#client/decentralized/peer";
import type { NodeID } from "#client/types";
import { PeerConnection, type EventConnection } from "#client/event_connection";
import { shortenId } from "#client/utils";

const debug = createDebug("discojs:client:decentralized:pool");

// TODO cleanup old peers

// Minimum delay in ms between the creation of two peers.
// Creating too many peers back to back creates an ICE deadlock 
const PEER_CREATION_STAGGER = 100;

let peerCreationQueue: Promise<unknown> = Promise.resolve();

async function createStaggered<T>(create: () => T): Promise<T> {
  const ready = peerCreationQueue;
  peerCreationQueue = ready.then(
    () => new Promise((resolve) => setTimeout(resolve, PEER_CREATION_STAGGER)),
  );

  await ready;
  return create();
}

export class PeerPool {
  private peers = Map<NodeID, PeerConnection>();

  // Signals received for peers we have not created yet.
  //
  // Peers create their connections at different times and in a different order,
  // so one can signal us before we reach it in our own creation loop. Its
  // signals are buffered here and replayed, in order, once we create our side.
  private pendingSignals = Map<NodeID, List<SignalData>>();

  constructor(private readonly id: NodeID) {}

  async shutdown(): Promise<void> {
    debug(`[${this.id}] is shutting down all its connections`);

    // Add a timeout o.w. the promise hangs forever if the other peer is already disconnected
    await Promise.race([
      Promise.all(this.peers.valueSeq().map((peer) => peer.disconnect())),
      new Promise((res, _) => setTimeout(res, 1000)), // Wait for other peers to finish
    ]);
    this.peers = Map();
    this.pendingSignals = Map();
  }

  signal(peerId: NodeID, signal: SignalData): void {
    debug(`[${this.id}] signals for %s`, peerId);

    const peer = this.peers.get(peerId);
    if (peer === undefined) {
      debug(
        `[${shortenId(this.id)}] buffers a signal for the not yet created %s`,
        shortenId(peerId),
      );
      this.pendingSignals = this.pendingSignals.update(
        peerId,
        List<SignalData>(),
        (signals) => signals.push(signal),
      );
      return;
    }

    peer.signal(signal);
  }

  async getPeers(
    peersToConnect: Set<NodeID>,
    signallingServer: EventConnection,
    // TODO as event?
    clientHandle: (connections: Map<NodeID, PeerConnection>) => void,
  ): Promise<Map<NodeID, PeerConnection>> {
    if (peersToConnect.contains(this.id)) {
      throw new Error("peers to connect contains our id");
    }

    debug(`[${this.id}] is connecting peers: %o`, peersToConnect.toArray());

    let newPeersConnections = Map<NodeID, PeerConnection>();
    for (const id of peersToConnect.filterNot((id) => this.peers.has(id))) {
      const connection = await createStaggered(
        () =>
          new PeerConnection(
            this.id,
            new Peer(id, id < this.id),
            signallingServer,
          ),
      );
      newPeersConnections = newPeersConnections.set(id, connection);

      // add the peer to the pool as soon as it exists so that `signal` reaches
      // it, then replay the signals that arrived while it did not exist
      this.peers = this.peers.set(id, connection);
      this.replayPendingSignals(id, connection);
    }

    clientHandle(this.peers);

    await Promise.all(
      newPeersConnections.valueSeq().map((conn) => conn.connect()),
    );
    debug(
      `[${this.id}] knowns connected peers: %o`,
      this.peers.keySeq().toArray(),
    );

    return this.peers.filter((_, id) => peersToConnect.has(id));
  }

  private replayPendingSignals(id: NodeID, connection: PeerConnection): void {
    const pending = this.pendingSignals.get(id);
    if (pending === undefined) return;
    this.pendingSignals = this.pendingSignals.delete(id);

    debug(
      `[${shortenId(this.id)}] replays %d buffered signals for %s`,
      pending.size,
      id,
    );
    pending.forEach((signal) => {
      connection.signal(signal);
    });
  }
}
