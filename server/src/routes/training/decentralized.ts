import createDebug from "debug";
import { v4 as randomUUID } from 'uuid'
import msgpack from 'msgpack-lite'
import type WebSocket from 'ws'
import { Map, Set } from 'immutable'

import type { Task, TaskID } from '@epfml/discojs'
import { client } from '@epfml/discojs'

import { TrainingRouter } from './base.js'

import messages = client.decentralized.messages
import AssignNodeID = client.messages.AssignNodeID
import MessageTypes = client.messages.type

const debug = createDebug("server:router:decentralized")

export class DecentralizedRouter extends TrainingRouter {
  /**
   * Map associating task ids to their sets of nodes who have contributed.
   */
  private readyNodes: Map<TaskID, Set<client.NodeID>> = Map()
  /**
   * Map associating node ids to their open WebSocket connections.
   */
  private connections: Map<client.NodeID, WebSocket> = Map()

  protected readonly description = 'Disco Decentralized Server'

  protected initTask (): void {}

  protected handle (task: Task, ws: WebSocket): void {
    // TODO @s314cy: add to task definition, to be used as threshold in aggregator
    const minimumReadyPeers = task.trainingInformation?.minimumReadyPeers ?? 3

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
              waitForMoreParticipants: (this.readyNodes.get(task.id)?.size ?? 0) < minimumReadyPeers
            }
            debug("peer ${peerId} joined ${task.id}");

            // Add the new task and its set of nodes
            if (!this.readyNodes.has(task.id)) {
              this.readyNodes = this.readyNodes.set(task.id, Set())
            }

            ws.send(msgpack.encode(msg), { binary: true })
            break
          }
          // Send by peers at the beginning of each training round to get the list
          // of active peers for this round.
          case MessageTypes.PeerIsReady: {
            const peers = this.readyNodes.get(task.id)?.add(peerId)
            if (peers === undefined) {
              throw new Error(`task ${task.id} doesn't exist in ready buffer`)
            }
            this.readyNodes = this.readyNodes.set(task.id, peers)
            if (peers.size >= minimumReadyPeers) {
              this.readyNodes = this.readyNodes.set(task.id, Set())

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
