import createDebug from "debug";
import { v4 as randomUUID } from 'uuid'
import * as msgpack from "@msgpack/msgpack";
import type WebSocket from 'ws'
import { Map } from 'immutable'

import { client, DataType } from "@epfml/discojs";

import { TrainingController } from './training_controller.js'

import messages = client.decentralized.messages
import MessageTypes = client.messages.type

const debug = createDebug("server:controllers:decentralized")

export class DecentralizedController<
	D extends DataType,
> extends TrainingController<D, "decentralized"> {
  // Map of nodes who want to join the round.
  // The boolean value indicates if the node is ready to exchange weight updates (i.e.
  // the node has already sent a PeerIsReady message)
  // We wait for all peers to be ready to exchange weight updates
  #roundPeers = Map<client.NodeID, boolean>()
  #connectFinishedNodes = Map<client.NodeID, boolean>()
  #aggregationRound = 0
  #timeout?: NodeJS.Timeout
  #connectionRetry= 0 // number of connection retrial for specific aggregationRound

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
            const msg: messages.NewDecentralizedNodeInfo = {
              type: MessageTypes.NewDecentralizedNodeInfo,
              id: peerId,
              nbOfParticipants: this.connections.size,
              waitForMoreParticipants: this.connections.size < minNbOfParticipants
            }
            ws.send(msgpack.encode(msg), { binary: true })
            // Send an update to participants if we can start/resume training
            this.sendEnoughParticipantsMsgIfNeeded(peerId)
            break
          }
          // Send by peers at the beginning of each training round to notify 
          // the server that they want to join the round
          case MessageTypes.JoinRound: {
            this.#roundPeers = this.#roundPeers.set(peerId, false)
            break
          }
          // Send by peers when they are ready to exchange weight updates to get the list
          // of active peers for this round.
          case MessageTypes.PeerIsReady: {
            this.#roundPeers = this.#roundPeers.set(peerId, true)
            debug("Received peer ready from: %o", shortId)
            this.sendPeersForRoundIfNeeded()
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
          case MessageTypes.ConnectionsReady: {
            this.#connectFinishedNodes = this.#connectFinishedNodes.set(peerId, true)
            this.signalWeightSharing()
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
      this.#roundPeers = this.#roundPeers.delete(peerId)
      debug("client [%s] left", shortId)

      // Check if we are already waiting for new participants to join
      if (this.waitingForMoreParticipants) return
      // If no, check if we are still above the minimum number of participant required
      if (this.connections.size >= minNbOfParticipants) {
        // Check if remaining peers are all ready to exchange weight updates
        this.sendPeersForRoundIfNeeded()
        return
      }
      // If we are below the minimum number of participants
      // tell remaining participants to wait until more participants join
      this.sendWaitForMoreParticipantsMsg()
    }) 
  }
  /**
   * Check if we have enough participants to start the training
   * and if all peers that joined the round are ready to exchange weight updates
   * If so, send the list of peers for this round to all participants
   */
  private sendPeersForRoundIfNeeded(): void {
    const minNbOfParticipants = this.task.trainingInformation.minNbOfParticipants
    const nbOfPeersReady = this.#roundPeers.filter(ready => ready).size
    // First check if there are enough participants to start the round
    // Then check if all peers that wanted to join this round are ready
    if (nbOfPeersReady < minNbOfParticipants
      || nbOfPeersReady != this.#roundPeers.size) return
    // Once every peer that joined the round is ready, we can start the round
    this.#roundPeers.keySeq()
    .map((id) => {
      const readyPeerIDs: messages.PeersForRound = {
        type: MessageTypes.PeersForRound,
        peers: this.#roundPeers.delete(id).keySeq().toArray(),
        aggregationRound: this.#aggregationRound
      }
      debug("Sending peer list to: %o", id.slice(0, 4))
      
      const encoded = msgpack.encode(readyPeerIDs)
      return [id, encoded] as [client.NodeID, Buffer]
    })
    .map(([id, encoded]) => {
      const conn = this.connections.get(id)
      if (conn === undefined) {
        throw new Error(`peer ${id} marked as ready but not connection to it`)
      }
      return [conn, encoded] as [WebSocket, Buffer]
    }).forEach(([conn, encoded]) => { conn.send(encoded) })

    // Initialize connectFinishedNodes with all peers set to false
    this.#connectFinishedNodes = this.#roundPeers.map(() => false)
    // Change the peer states to not ready
    this.#roundPeers = this.#roundPeers.map(() => false)
    
    // Start timeout to check peer connections are successful
    this.startTimeout()
  }

  /**
   * Check if all the participants of the round finished connecting 
   * with other peers in the round
   * If so, send StartWeightSharing message to signal peers to proceed
   */
  private signalWeightSharing(): void {
    // Return if not all participants are ready
    if (!this.#connectFinishedNodes.every((ready) => ready))
      return

    // Stop the timeout
    this.clearTimeout()

    // Send round participants StartWeightSharing messages
    this.#roundPeers.keySeq()
    .map((id) => {
      const startSignal = {
        type: MessageTypes.StartWeightSharing,
      }
      debug("Signaling weight sharing to: %o", id.slice(0, 4))

      const encoded = msgpack.encode(startSignal)
      return [id, encoded] as [client.NodeID, Buffer]
    })
    .map(([id, encoded]) => {
      const conn = this.connections.get(id)
      if (conn === undefined) {
        throw new Error(`peer ${id} marked as ready but not connection to it`)
      }
      return [conn, encoded] as [WebSocket, Buffer]
    })
    .forEach(([conn, encoded]) => {conn.send(encoded)})

    // empty the list of peers for the next round
    this.#roundPeers = Map()
    this.#connectFinishedNodes = Map()
    this.#aggregationRound++
  }

  /**
   * Set a timeout to check peer connections establishment
   */
  private startTimeout(maxTime: number = 60_000): void {
    this.#timeout = setTimeout(() => {
      this.handleTimeout()
    }, maxTime)
  }

  /**
   * Clear previously set timeout once all peer connections 
   * are established before the timeout
   */
  private clearTimeout(): void {
    if (this.#timeout !== undefined){
      clearTimeout(this.#timeout)
      this.#timeout = undefined
    }
  }
  
  /**
   * Called when a timeout occurs during peer connection
   * Signals peers to discard existing connections and
   * reestablish connections with the current set of peers
   */
  private handleTimeout(): void {
    debug(`Connection setup timeout for round ${this.#aggregationRound}, Retrying with same peers`)
    // Increment the connection retry count
    this.#connectionRetry += 1;

    // If the number of retries exceeds the threshold, exclude the failed peers from the roundPeers
    if (this.#connectionRetry >= 3){
      const numFailedClient = this.#connectFinishedNodes.valueSeq().count((val) => val === false)
      const remainingPeers = this.#roundPeers.size - numFailedClient

      // Exclude the failed peers
      this.#connectFinishedNodes.forEach((connected, nodeId) => {
        if (!connected){
          // If the node failed connection, exclude from #roundPeers
          this.#roundPeers = this.#roundPeers.delete(nodeId)
          // Signal the node that connection is failed for that node
          const conn = this.connections.get(nodeId)
          if (conn === undefined) {
            throw new Error(`peer ${nodeId} marked as ready but not connection to it`)
          }
          const failSignal : messages.ConnectionFail = {
            type: MessageTypes.ConnectionFail
          }
          const encoded = msgpack.encode(failSignal)
          conn.send(encoded)
        }
      })

      // If excluding failed peers would leave too few participants,
      // restart the round
      // TODO: We need to wait until minNbOfParticipants is satisfied
      if (remainingPeers < this.task.trainingInformation.minNbOfParticipants){
        this.#roundPeers.keySeq()
        .map((id) => {
          const retrySignal = {
            type: MessageTypes.RetryPeerConnections,
          }
          debug("Signaling connection retry to: %o", id.slice(0, 4))

          const encoded = msgpack.encode(retrySignal)
          return [id, encoded] as [client.NodeID, Buffer]
        })
        .map(([id, encoded]) => {
          const conn = this.connections.get(id)
          if (conn === undefined) {
            throw new Error(`peer ${id} marked as ready but not connection to it`)
          }
          return [conn, encoded] as [WebSocket, Buffer]
        })
        .forEach(([conn, encoded]) => {conn.send(encoded)})

        // empty the list of peers for the new round
        // round number is not increased since this round failed
        this.#roundPeers = Map()
        this.#connectFinishedNodes = Map()
        this.#connectionRetry = 0
        return
      }
    }

    // Retry peer connection with the currently remaining round peers
    this.#connectFinishedNodes = this.#roundPeers.map(() => false)
    this.#connectionRetry = 0

    this.#roundPeers.keySeq()
    .map((id) => {
      const retrySignal = {
        type: MessageTypes.RetryPeerConnections,
      }
      debug("Signaling connection retry to: %o", id.slice(0, 4))

      const encoded = msgpack.encode(retrySignal)
      return [id, encoded] as [client.NodeID, Buffer]
    })
    .map(([id, encoded]) => {
      const conn = this.connections.get(id)
      if (conn === undefined) {
        throw new Error(`peer ${id} marked as ready but not connection to it`)
      }
      return [conn, encoded] as [WebSocket, Buffer]
    })
    .forEach(([conn, encoded]) => {conn.send(encoded)})
  }
}

