import createDebug from "debug";
import { v4 as randomUUID } from 'uuid'
import msgpack from 'msgpack-lite'
import type WebSocket from 'ws'
import { Map, Set } from 'immutable'

import { client } from '@epfml/discojs'

import { TrainingController } from './training_controller.js'

import messages = client.decentralized.messages
import AssignNodeID = client.messages.AssignNodeID
import MessageTypes = client.messages.type

const debug = createDebug("server:controllers:decentralized")

export class DecentralizedController extends TrainingController {
  /**
   * Set of nodes who have contributed.
   */
  private readyNodes = Set<client.NodeID>()
  /**
   * Map associating node ids to their open WebSocket connections.
   */
  private connections: Map<client.NodeID, WebSocket> = Map()

  initTask (): void {}

  handle (ws: WebSocket): void {
    const minimumReadyPeers = this.task.trainingInformation.minNbOfParticipants

    // Peer id of the message sender
    let peerId = randomUUID()
    while (this.connections.has(peerId)) {
      peerId = randomUUID()
    }

    // How the server responds to messages
    ws.on('message', (data: Buffer) => {
      try {
        const msg: unknown = msgpack.decode(data)
        if (!messages.isMessageToServer(msg))
          return debug("invalid message received: %o", msg);

        switch (msg.type) {
          // A new peer joins the network for a task
          case MessageTypes.ClientConnected: {
            this.connections = this.connections.set(peerId, ws)

            // Answer with client id in an AssignNodeID message
            const msg: AssignNodeID = {
              type: MessageTypes.AssignNodeID,
              id: peerId,
              waitForMoreParticipants: this.readyNodes.size  < minimumReadyPeers // ground work for #718
            }
            debug("peer ${peerId} joined ${task.id}");

            ws.send(msgpack.encode(msg), { binary: true })
            break
          }
          // Send by peers at the beginning of each training round to get the list
          // of active peers for this round.
          case MessageTypes.PeerIsReady: {
            const peers = this.readyNodes.add(peerId)
            if (peers.size >= minimumReadyPeers) {
              this.readyNodes = Set()

              peers
                .map((id) => {
                  const readyPeerIDs: messages.PeersForRound = {
                    type: MessageTypes.PeersForRound,
                    peers: peers.delete(id).toArray()
                  }
                  const encoded = msgpack.encode(readyPeerIDs)
                  return [id, encoded] as [client.NodeID, Buffer]
                })
                .map(([id, encoded]) => {
                  const conn = this.connections.get(id)
                  if (conn === undefined) {
                    throw new Error(`peer ${id} marked as ready but not connection to it`)
                  }
                  return [conn, encoded] as [WebSocket, Buffer]
                }).forEach(([conn, encoded]) => { conn.send(encoded) }
                )
            } else {
              this.readyNodes = peers
            }
            break
          }
          // Forwards a peer's message to another destination peer
          // Used to exchange peer's information and establish a direct
          // WebRTC connection between them
          case MessageTypes.SignalForPeer: {
            const forward: messages.SignalForPeer = {
              type: MessageTypes.SignalForPeer,
              peer: peerId,
              signal: msg.signal
            }
            this.connections.get(msg.peer)?.send(msgpack.encode(forward))
            break
          }
          default: {
            const _: never = msg
            throw new Error('should never happen')
          }
        }
      } catch (e) {
        debug("when processing WebSocket message: %o", e);
      }
    })
  }
}
