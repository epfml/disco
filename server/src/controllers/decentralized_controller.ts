import createDebug from "debug";
import { v4 as randomUUID } from 'uuid'
import msgpack from 'msgpack-lite'
import type WebSocket from 'ws'
import { Set } from 'immutable'

import { client } from '@epfml/discojs'

import { TrainingController } from './training_controller.js'

import messages = client.decentralized.messages
import MessageTypes = client.messages.type

const debug = createDebug("server:controllers:decentralized")

export class DecentralizedController extends TrainingController {
  /**
   * Set of nodes who have contributed.
   */
  private readyNodes = Set<client.NodeID>()

  handle (ws: WebSocket): void {
    const minNbOfParticipants = this.task.trainingInformation.minNbOfParticipants

    // Peer id of the message sender
    let peerId = randomUUID()
    while (this.connections.has(peerId)) {
      peerId = randomUUID()
    }
    const shortId = peerId.slice(0, 4)


    // How the server responds to messages
    ws.on('message', (data: Buffer) => {
      try {
        const msg: unknown = msgpack.decode(data)
        if (!messages.isMessageToServer(msg))
          return debug("invalid message received: %o", msg);

        switch (msg.type) {
          // A new peer joins the network for a task
          case MessageTypes.ClientConnected: {
            debug(`peer [%s] joined ${this.task.id}`, shortId)
            this.connections = this.connections.set(peerId, ws)

            // Answer with client id in an NewNodeInfo message
            const waitForMoreParticipants = this.connections.size < minNbOfParticipants
            const msg: messages.NewDecentralizedNodeInfo = {
              type: MessageTypes.NewDecentralizedNodeInfo,
              id: peerId,
              waitForMoreParticipants
            }
            ws.send(msgpack.encode(msg), { binary: true })
            debug("Wait for more participant flag: %o", waitForMoreParticipants)
            // Send an update to participants if we can start/resume training
            this.checkIfEnoughParticipants(waitForMoreParticipants, peerId)
            break
          }
          // Send by peers at the beginning of each training round to get the list
          // of active peers for this round.
          case MessageTypes.PeerIsReady: {
            const peers = this.readyNodes.add(peerId)
            if (peers.size >= minNbOfParticipants) {
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
    // Setup callback for client leaving the session
    ws.on('close', () => {
      // Remove the participant when the websocket is closed
      this.connections = this.connections.delete(peerId)
      debug("client [%s] left", shortId)

      // Check if we dropped below the minimum number of participant required
      // or if we are already waiting for new participants to join
      if (this.connections.size >= minNbOfParticipants ||
        this.waitingForMoreParticipants
      ) return

      this.waitingForMoreParticipants = true
      // Tell remaining participants to wait until more participants join
      this.connections
        .forEach((participantWs, participantId) => {
          debug("Telling remaining client [%s] to wait for participants", participantId.slice(0, 4))
          const msg: client.messages.WaitingForMoreParticipants = {
            type: MessageTypes.WaitingForMoreParticipants
          }
          participantWs.send(msgpack.encode(msg))
        })
    }) 
  }
}
