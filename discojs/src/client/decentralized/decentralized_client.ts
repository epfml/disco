import createDebug from "debug";
import { Map, Set } from 'immutable'

import { DataType, Model, WeightsContainer } from "../../index.js";
import { serialization } from "../../index.js";
import { Client,  shortenId } from '../client.js'
import { type NodeID } from '../index.js'
import { type, type ClientConnected, NarrowMessage } from '../messages.js'
import { timeout } from '../utils.js'
import { WebSocketServer, waitMessage, type PeerConnection, waitMessageWithTimeout } from '../event_connection.js'
import { PeerPool } from './peer_pool.js'
import * as messages from './messages.js'

const debug = createDebug("discojs:client:decentralized");

/**
 * Represents a decentralized client in a network of peers. Peers coordinate each other with the
 * help of the network's server, yet only exchange payloads between each other. Communication
 * with the server is based off regular WebSockets, whereas peer-to-peer communication uses
 * WebRTC for Node.js.
 */
export class DecentralizedClient extends Client<"decentralized"> {
  /**
   * The pool of peers to communicate with during the current training round.
   */
  #pool?: PeerPool
  #connections?: Map<NodeID, PeerConnection>

  // Store the latest model
  // This is used when the client becomes a model provider for a newcomer
  #latestModel?: WeightsContainer

  // Flag if this model requires model synchronization 
  #modelSyncNeeded?: boolean

  // Check if the training round is in progress 
  // Used to get the latest model for model synchronization
  #roundFinishedPromise?: Promise<void>
  #resolveRoundFinished?: () => void // contains resolver

  // Used to handle timeouts and promise resolving after calling disconnect
  private get isDisconnected() : boolean {
    return this._server === undefined
  }

  private setAggregatorNodes(nodes: Set<NodeID>) {
    this.aggregator.setNodes(nodes)
    // Emits the `participants` event
    this.nbOfParticipants = this.aggregator.nodes.size === 0 ? 1 : this.aggregator.nodes.size
  }

  private cloneWeights(weights: WeightsContainer): WeightsContainer {
    return new WeightsContainer(weights.weights.map(t => t.clone()))
  }

  // Used by model provider peer during model syncing
  private async handleSignalNewPeer(event: NarrowMessage<type.SignalNewPeer>): Promise<void> {
      if (this.#pool === undefined){
        throw new Error('received signal about new peer but peer pool is undefined')
      }
      const roundFinishedPromise = this.#roundFinishedPromise

      // Note:
      // getPeers() keeps the temporary connection with model provider even after model synchronization. 
      // This connection is not added to #connections so it is not used for aggregation.
      const syncConnection = await this.#pool.getPeers(Set([event.newNode]), this.server, ()=>{})

      const newcomerConn = syncConnection.get(event.newNode)

      if (newcomerConn === undefined){
        // if connection with newly joining client fails, print debug message
        // and return
        debug(`Cannot connect to newly joined client [${event.newNode}]`)
        return
      }

      await this.sendModel(newcomerConn, roundFinishedPromise)
  }
  
  /**
   * Public method called by disco.ts when starting training. This method sends
   * a message to the server asking to join the task and be assigned a client ID.
   * 
   * The peer also establishes a WebSocket connection with the server to then 
   * create peer-to-peer WebRTC connections with peers. The server is used to exchange
   * peers network information.
   */
  override async connect(): Promise<Model<DataType>> {
    const model = await super.connect()  // Get the server base model
    const serverURL = new URL('', this.url.href)
    switch (this.url.protocol) {
      case 'http:':
        serverURL.protocol = 'ws:'
        break
      case 'https:':
        serverURL.protocol = 'wss:'
        break
      default:
        throw new Error(`unknown protocol: ${this.url.protocol}`)
    }
    serverURL.pathname += `decentralized/${this.task.id}`
    // Create a WebSocket connection with the server
    // The client then waits for the server to forward it other client's network information.
    // Upon receiving other peer's information, the clients establish a peer-to-peer WebRTC connection.
    this._server = await WebSocketServer.connect(serverURL, messages.isMessageFromServer, messages.isMessageToServer)
    this.server.on(type.SignalForPeer, (event) => {
      if (this.#pool === undefined) throw new Error('received signal but peer pool is undefined')
      // Create a WebRTC connection with the peer
      this.#pool.signal(event.peer, event.signal)
    })

    // Listen if the client is selected as a model provider node for a newly joining client.
    // Upon receiving the signal, this client establishes a connection with the newcomer
    // and sends the latest model weights.
    this.server.on(type.SignalNewPeer, (event) => {
      void this.handleSignalNewPeer(event)
    })

    // c.f. setupServerCallbacks doc for explanation
    let receivedEnoughParticipants = false
    this.setupServerCallbacks(() => receivedEnoughParticipants = true)
    
    const msg: ClientConnected = {
      type: type.ClientConnected
    }
    this.server.send(msg)
    
    const { id, waitForMoreParticipants,
      nbOfParticipants, joinedMidTraining } = await waitMessage(this.server, type.NewDecentralizedNodeInfo)

    this.#modelSyncNeeded = joinedMidTraining
    this.nbOfParticipants = nbOfParticipants
    

    // This should come right after receiving the message to make sure
    // we don't miss a subsequent message from the server
    // We check if the server is telling us to wait for more participants
    // and we also check if a EnoughParticipant message ended up arriving
    // before the NewNodeInfo
    if (waitForMoreParticipants && !receivedEnoughParticipants) {
      // Create a promise that resolves when enough participants join
      // The client will await this promise before sending its local weight update
      this.promiseForMoreParticipants = this.createPromiseForMoreParticipants()
    }

    debug(`[${shortenId(id)}] assigned id generated by server`);

    if (this._ownId !== undefined) {
      throw new Error('received id from server but was already received')
    }
    this._ownId = id
    this.#pool = new PeerPool(id)
    return model
  }

  override async disconnect (): Promise<void> {
    // Disconnect from peers
    await this.#pool?.shutdown()
    this.#pool = undefined

    if (this.#connections !== undefined) {
      const peers = this.#connections.keySeq().toSet()
      this.setAggregatorNodes(this.aggregator.nodes.subtract(peers))
    }
    // Disconnect from server
    await this.server?.disconnect()
    this._server = undefined
    this._ownId = undefined
    
    return Promise.resolve()
  }

  /**
   * At the beginning of a round, each peer tells the server it is ready to proceed
   * The server answers with the list of all peers connected for the round
   * Given the list, the peers then create peer-to-peer connections with each other.
   * When connected, one peer creates a promise for every other peer's weight update
   * and waits for it to resolve.
   * 
   * If a client joined the training after the first round, 
   * model syncing happens first to get the latest model.
   */
  override async onRoundBeginCommunication(): Promise<void> {
    if (this.#modelSyncNeeded) {
      // 1. If model sync is needed, send server a request
      this.server.send({ type: type.ModelSyncRequest })

      // 2. Get the provider information from the server
      const providerInfo = await waitMessageWithTimeout(this.server, type.SignalModelProvider, this.task.trainingInformation.maxModelSyncTime, "Timeout while waiting for the latest model provider")
      
      if (this.#pool === undefined) {
        throw new Error('peer pool is undefined, make sure to call `client.connect()` first')
      }

      // 3. Connect with model provider client and get the latest model
      const syncConnection = await this.#pool.getPeers(
        Set([providerInfo.providerNode]),
        this.server,
        ()=>{}
      )
      const providerConn = syncConnection.get(providerInfo.providerNode)

      if (providerConn === undefined){
        throw new Error("The latest model provider is not connected")
      }

      const latestModel = await this.receiveModel(providerConn)

      this.#latestModel = this.cloneWeights(latestModel)

      this.emit("modelSynced", this.cloneWeights(latestModel))
      this.#modelSyncNeeded = false
    }

    // Notify the server we want to join the next round so that the server
    // waits for us to be ready before sending the list of peers for the round
    this.server.send({ type: type.JoinRound })
    // Store the promise for the current round's aggregation result.
    // We will await for it to resolve at the end of the round when exchanging weight updates.
    this.aggregationResult = this.aggregator.getPromiseForAggregation()

    // Do not proceed to local training when minNbOfParticipants condition is not satisfied
    await this.waitForParticipantsIfNeeded()

    this.saveAndEmit("local training")
    return Promise.resolve()
  }

  override async onRoundEndCommunication (weights: WeightsContainer): Promise<WeightsContainer> {
    if (this.aggregationResult === undefined) {
      throw new TypeError('aggregation result promise is undefined')
    }
    // Save the status in case participants leave and we switch to waiting for more participants
    // Once enough new participants join we can display the previous status again
    this.saveAndEmit("connecting to peers")
    // First we check if we are waiting for more participants before sending our weight update

    while(true){
      // Wait until enough participants are available before continuing the round
      // Checks minNbOfParticipants requirement for 
      // when participants disconnect when connection error happens continuously
      await this.waitForParticipantsIfNeeded()

      // Create peer-to-peer connections with all peers for the round
      await this.establishPeerConnections()

      // Wait for connection related messages from the server before exchanging weight updates
      // (1) If the client receives a StartWeightSharing message, it proceeds to weight update exchange
      // (2) If it receives a RetryPeerConnections message, it retries peer connection establishment
      // (3) After multiple retires, if the connection is still unsuccessful, the server starts excluding nodes from the round
      // and sends a ConnectionFail message to those nodes
      // (4) Upon receiving ConnectionFail, the client disconnects from the server
      // TODO: Promise.race() does not close the waitMessage listeners that lost the race.
      // Therefore, unsolved listeners may accumulate across rounds.
      // We can add listener resolving if this becomes a problem later.
      const msg = await Promise.race([
        waitMessage(this.server, type.StartWeightSharing),
        waitMessage(this.server, type.RetryPeerConnections),
        waitMessage(this.server, type.ConnectionFail),
      ])

      if (msg.type === type.StartWeightSharing){
        // Generate a promise that resolves when round training finishes
        if (this.#roundFinishedPromise === undefined){
          this.#roundFinishedPromise = new Promise<void>((resolve) => { 
            this.#resolveRoundFinished = resolve
          })
        }
        break
      } else if (msg.type === type.RetryPeerConnections){
        debug(`[${shortenId(this.ownId)}] retrying peer connection establishment`)
        // clear the communication round peer pool
        await this.#pool?.shutdown()
        this.#pool = new PeerPool(this.ownId)
        // clear the connections
        this.#connections = Map()
        this.setAggregatorNodes(Set(this.ownId))
        continue
      } else if (msg.type === type.ConnectionFail){
        debug(`[${shortenId(this.ownId)}] disconnect from the server`)
        await this.disconnect()
        throw new Error("Client disconnected after connection failure")
      }
    }
    // Exchange weight updates with peers and return aggregated weights
    const aggregatedWeight = await this.exchangeWeightUpdates(weights)

    return aggregatedWeight
  }

  /**
   * Signal to the server that we are ready to exchange weights.
   * Once enough peers are ready, the server sends the list of peers for this round
   * and the peers can establish peer-to-peer connections with each other.
   */
  private async establishPeerConnections(): Promise<void> {
    if (this.server === undefined) {
      throw new Error("peer's server is undefined, make sure to call `client.connect()` first")
    } if (this.#pool === undefined) {
        throw new Error('peer pool is undefined, make sure to call `client.connect()` first')
    }

    // Reset peers list at each round of training to make sure client works with an updated peers
    // list, maintained by the server. Adds any received weights to the aggregator.
    // Tell the server we are ready for the next round
    const readyMessage: messages.PeerIsReady = { type: type.PeerIsReady }
    this.server.send(readyMessage)

    // Wait for the server to answer with the list of peers for the round
    try {
      debug(`[${shortenId(this.ownId)}] is waiting for peer list for round ${this.aggregator.round}`);
      const receivedMessage = await waitMessage(this.server, type.PeersForRound)

      const peers = Set(receivedMessage.peers)
      debug(`[${shortenId(this.ownId)}] received peer list: %o`, peers.toArray());

      if (this.ownId !== undefined && peers.has(this.ownId)) {
        throw new Error('received peer list contains our own id')
      }
      // Store the list of peers for the current round including ourselves
      this.setAggregatorNodes(peers.add(this.ownId))
      this.aggregator.setRound(receivedMessage.aggregationRound) // the server gives us the round number

      // Initiate peer to peer connections with each peer
      // When connected, create a promise waiting for each peer's round contribution
      const connections = await this.#pool.getPeers(
        peers,
        this.server,
        // Init receipt of peers weights. this awaits the peer's
        // weight update and adds it to our aggregator upon reception
        (conn) => this.receivePayloads(conn)
      )

      // Signal server that all connections with other peers in the round are established
      this.server.send({ type: type.ConnectionsReady });
      debug(`[${shortenId(this.ownId)}] peer connections ready: %o`, connections.keySeq().toJS());
      this.#connections = connections
    } catch (e) {
      debug(`Error for [${shortenId(this.ownId)}] while beginning round: %o`, e);
      this.setAggregatorNodes(Set(this.ownId))
      this.#connections = Map()
    }
  }

  /**
   * At each communication rounds, awaits peers contributions and add them to the client's aggregator.
   * This method is used as callback by getPeers when connecting to the rounds' peers
   * @param connections 
   * @param round 
   */
  private receivePayloads (connections: Map<NodeID, PeerConnection>): void {
    connections.forEach(async (connection, peerId) => {
      debug(`waiting for peer ${peerId}`);
      for (let r = 0; r < this.aggregator.communicationRounds; r++) {
        try {
          const message = await waitMessageWithTimeout(connection, type.Payload,
            60_000, "Timeout waiting for a contribution from peer " + peerId)
          const decoded = serialization.weights.decode(message.payload)

          if (!this.aggregator.isValidContribution(peerId, message.aggregationRound)) {
            debug(`[${shortenId(this.ownId)}] failed to add contribution from peer ${shortenId(peerId)}`);  
          }
          else {
            debug(`[${shortenId(this.ownId)}] received payload from peer ${shortenId(peerId)}` +
              ` for round (%d, %d)`, message.aggregationRound, message.communicationRound);
            this.aggregator.once("aggregation", () =>
                debug(`[${shortenId(this.ownId)}] aggregated the model` +
                  ` for round (%d, %d)`, message.aggregationRound, message.communicationRound)
              )
            this.aggregator.add(peerId, decoded, message.aggregationRound, message.communicationRound)
          }
        } catch (e) {
          if (this.isDisconnected) return
          debug(`Error for [${shortenId(this.ownId)}] while receiving payloads: %o`, e);
        }
      }
    })
  }

  private async exchangeWeightUpdates(weights: WeightsContainer): Promise<WeightsContainer> {
    if (this.aggregationResult === undefined) {
      throw new TypeError('aggregation result promise is undefined')
    }
    this.saveAndEmit("updating model")
    // Perform the required communication rounds. Each communication round consists in sending our local payload,
    // followed by an aggregation step triggered by the receipt of other payloads, and handled by the aggregator.
    // A communication round's payload is the aggregation result of the previous communication round. The first
    // communication round simply sends our training result, i.e. model weights updates. This scheme allows for
    // the aggregator to define any complex multi-round aggregation mechanism.
    let result = weights;
    for (let communicationRound = 0; communicationRound < this.aggregator.communicationRounds; communicationRound++) {
      const connections = this.#connections
      if (connections === undefined) throw new Error("peer's connections is undefined")
      // Generate our payloads for this communication round and send them to all ready connected peers
      const payloads = this.aggregator.makePayloads(result)
      payloads.forEach(async (payload, id) => {
        // add our own contribution to the aggregator
        if (id === this.ownId) {
          this.aggregator.add(this.ownId, payload, this.aggregator.round, communicationRound)
          return
        }
        // Send our payload to each peer
        const peer = connections.get(id)
        if (peer !== undefined) {
          const encoded = await serialization.weights.encode(payload)
          const msg: messages.PeerMessage = {
            type: type.Payload,
            peer: id,
            aggregationRound: this.aggregator.round,
            communicationRound,
            payload: encoded
          }
          peer.send(msg)
          debug(`[${shortenId(this.ownId)}] send weight update to peer ${shortenId(msg.peer)}` +
            ` for round (%d, %d)`, this.aggregator.round, communicationRound);
        }
      })
      // Wait for aggregation before proceeding to the next communication round.
      // The current result will be used as payload for the eventual next communication round.
      try { 
        result = await Promise.race([
          this.aggregationResult,
          timeout(undefined, "Timeout waiting on the aggregation result promise to resolve")
        ])
      } catch (e) {
        if (this.isDisconnected) {
          return weights
        }
        debug(`[${shortenId(this.ownId)}] while waiting for aggregation: %o`, e);
        break
      }

      // There is at least one communication round remaining
      if (communicationRound < this.aggregator.communicationRounds - 1) {
        // Reuse the aggregation result
        this.aggregationResult = this.aggregator.getPromiseForAggregation()
      }
    }
    return await this.aggregationResult
  }

  /**
   * Receive model from the model provider.
   */
  private async receiveModel(providerConn: PeerConnection): Promise<WeightsContainer>{
    const message = await waitMessageWithTimeout(providerConn, type.SharedModel, this.task.trainingInformation.maxModelSyncTime, "Timeout while waiting for the latest model")
    
    const decoded = serialization.weights.decode(message.model)
    return decoded
  }

  /**
   * Send the latest available model to a newly joining client.
   * If the current training round is in progress, wait until the round finishes
   * and receive the latest aggregated model.
   */
  private async sendModel(newcomerConn: PeerConnection, roundFinishedPromise: Promise<void> | undefined): Promise<void> {
    // wait until the round finishes to get the latest model
    if (roundFinishedPromise !== undefined){
      await roundFinishedPromise
    }

    const model = this.#latestModel

    if (model === undefined){
      debug("Failed to get the latest model from model provider client")
      return
    }
    const encoded = await serialization.weights.encode(this.cloneWeights(model))

    const message: messages.SharedModel = {
        type: type.SharedModel,
        model: encoded
      }
    newcomerConn.send(message)
  }

  // Resolve the round finished promise and reset related state
  override finishRound(latestWeights: WeightsContainer): void{
    // Set the new latest model
    this.#latestModel = this.cloneWeights(latestWeights)

    // Mark round as finished so that model synchronization can proceed
    this.#resolveRoundFinished?.()
    this.#roundFinishedPromise = undefined
    this.#resolveRoundFinished = undefined
  }
}
