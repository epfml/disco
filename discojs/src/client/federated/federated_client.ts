import createDebug from "debug";

import { serialization } from "../../index.js";
import type { Model, RoundStatus, WeightsContainer } from "../../index.js";
import { Client } from "../client.js";
import { type, type ClientConnected } from "../messages.js";
import {
  type EventConnection,
  waitMessage,
  waitMessageWithTimeout,
  WebSocketServer,
} from "../event_connection.js";
import * as messages from "./messages.js";

const debug = createDebug("discojs:client:federated");

/**
 * Arbitrary node id assigned to the federated server which we are communicating with.
 * Indeed, the server acts as a node within the network. In the federated setting described
 * by this client class, the server is the only node which we are communicating with.
*/
const SERVER_NODE_ID = "federated-server-node-id";

/**
 * Client class that communicates with a centralized, federated server, when training
 * a specific task in the federated setting.
 */
export class FederatedClient extends Client {  
  // Total number of other federated contributors, including this client, excluding the server
  // E.g., if 3 users are training a federated model, nbOfParticipants is 3
  #nbOfParticipants: number = 1;
  
  /**
   * When the server notifies clients to pause and wait until more
   * participants join, we rely on this promise to wait
   * until the server signals that the training can resume
   */
  #promiseForMoreParticipants: Promise<void> | undefined = undefined;
  
  /**
   * When the server notifies the client that they can resume training
   * after waiting for more participants, we want to be able to display what
   * we were doing before waiting (training locally or updating our model).
   * We use this attribute to store the status to rollback to when we stop waiting
   */
  #previousStatus: RoundStatus | undefined = undefined;

   /**
   * Whether the client should wait until more
   * participants join the session, i.e. a promise has been created
   */
  get #waitingForMoreParticipants(): boolean {
    return this.#promiseForMoreParticipants !== undefined 
  }

  // the number of participants excluding the server
  override get nbOfParticipants(): number {
    return this.#nbOfParticipants
  }

  /**
   * Opens a new WebSocket connection with the server and listens to new messages over the channel
   */
  private async connectServer(url: URL): Promise<EventConnection> {
    const server: EventConnection = await WebSocketServer.connect(
      url,
      messages.isMessageFederated, // can only receive federated message types from the server
      messages.isMessageFederated, // idem for messages that the client can send
    );
    return server;
  }

  /**
   * Initializes the connection to the server, gets our node ID
   * as well as the latest training information: latest global model, current round and
   * whether we are waiting for more participants.
   */
  async connect(): Promise<Model> {
    const model = await super.connect() // Get the server base model

    const serverURL = new URL("", this.url.href);
    switch (this.url.protocol) {
      case "http:":
        serverURL.protocol = "ws:";
        break;
      case "https:":
        serverURL.protocol = "wss:";
        break;
      default:
        throw new Error(`unknown protocol: ${this.url.protocol}`);
    }

    serverURL.pathname += `federated/${this.task.id}`;

    this._server = await this.connectServer(serverURL);
    
    // Setup an event callback if the server signals that we should 
    // wait for more participants
    this.server.on(type.WaitingForMoreParticipants, () => {
      debug(`[${id.slice(0, 4)}] received WaitingForMoreParticipants message from server`)
      // Display the waiting status right away
      this.emit("status", "NOT ENOUGH PARTICIPANTS")
      // Upon receiving a WaitingForMoreParticipants message,
      // the client will await for this promise to resolve before sending its
      // local weight update
      this.#promiseForMoreParticipants = this.waitForMoreParticipants()
    })

    // As an example assume we need at least 2 participants to train,
    // When two participants join almost at the same time, the server
    // sends a NewFederatedNodeInfo with waitForMoreParticipants=true to the first participant
    // and directly follows with an EnoughParticipants message when the 2nd participant joins
    // However, the EnoughParticipants can arrive before the NewFederatedNodeInfo (which is much bigger)
    // so we check whether we received the EnoughParticipants before being assigned a node ID
    let receivedEnoughParticipants = false
    this.server.once(type.EnoughParticipants, () => {
      if (this._ownId === undefined) {
        debug(`Received EnoughParticipants message from server before the NewFederatedNodeInfo message`)
        receivedEnoughParticipants = true
      }
    })

    this.aggregator.registerNode(SERVER_NODE_ID);

    const msg: ClientConnected = {
      type: type.ClientConnected,
    };
    this.server.send(msg);

    const {
      id, waitForMoreParticipants, payload,
      round, nbOfParticipants
    } = await waitMessageWithTimeout(this.server, type.NewFederatedNodeInfo);
    
    // This should come right after receiving the message to make sure
    // we don't miss a subsequent message from the server
    // We check if the server is telling us to wait for more participants
    // and we also check if a EnoughParticipant message ended up arriving
    // before the NewFederatedNodeInfo
    if (waitForMoreParticipants && !receivedEnoughParticipants) {
      // Create a promise that resolves when enough participants join
      // The client will await this promise before sending its local weight update
      this.#promiseForMoreParticipants = this.waitForMoreParticipants()
    }
    if (this._ownId !== undefined) {
      throw new Error('received id from server but was already received')
    }
    this._ownId = id;
    debug(`[${id.slice(0, 4)}] joined session at round ${round} `);
    this.aggregator.setRound(round)
    this.#nbOfParticipants = nbOfParticipants
    // Upon connecting, the server answers with a boolean
    // which indicates whether there are enough participants or not
    debug(`[${this.ownId.slice(0, 4)}] upon connecting, wait for participant flag %o`, this.#waitingForMoreParticipants)
    model.weights = serialization.weights.decode(payload)
    return model
  }

  /**
   * Method called when the server notifies the client that there aren't enough 
   * participants (anymore) to start/continue training
   * The method creates a promise that will resolve once the server notifies 
   * the client that the training can resume via a subsequent EnoughParticipants message
   * @returns a promise which resolves when enough participants joined the session
   */
  private async waitForMoreParticipants(): Promise<void> {
    return new Promise<void>((resolve) => {
      // "once" is important because we can't resolve the same promise multiple times
      this.server.once(type.EnoughParticipants, () => {
        debug(`[${this.ownId.slice(0, 4)}] received EnoughParticipants message from server`)
        // Emit the last status emitted before waiting if defined
        if (this.#previousStatus !== undefined) this.emit("status", this.#previousStatus)
        resolve()
      })
    })
  }

  /**
   * Disconnection process when user quits the task.
   */
  override async disconnect(): Promise<void> {
    await this.server.disconnect();
    this._server = undefined;
    this._ownId = undefined;

    this.aggregator.setNodes(this.aggregator.nodes.delete(SERVER_NODE_ID));
  }

  override onRoundBeginCommunication(): Promise<void> {
    // Prepare the result promise for the incoming round
    this.aggregationResult = new Promise((resolve) => this.aggregator.once('aggregation', resolve))
    // Save the status in case participants leave and we switch to waiting for more participants
    // Once enough new participants join we can display the previous status again
    this.#previousStatus = "TRAINING"
    this.emit("status", this.#previousStatus)
    return Promise.resolve();
  }

  /**
   * Send the local weight update to the server and waits (indefinitely) for the server global update
   * 
   * If the waitingForMoreParticipants flag is set, we first wait (also indefinitely) until the 
   * server notifies us that the training can resume.
   * 
  // NB: For now, we suppose a fully-federated setting.
   * @param weights Local weights sent to the server at the end of the local training round
   * @returns the new global weights sent by the server
   */
  override async onRoundEndCommunication(weights: WeightsContainer): Promise<WeightsContainer> {
    if (this.aggregationResult === undefined) {
      throw new Error("local aggregation result was not set");
    }

    // First we check if we are waiting for more participants before sending our weight update
    if (this.#waitingForMoreParticipants) {
      // wait for the promise to resolve, which takes as long as it takes for new participants to join
      debug(`[${this.ownId.slice(0, 4)}] is awaiting the promise for more participants`)
      this.emit("status", "NOT ENOUGH PARTICIPANTS")
      await this.#promiseForMoreParticipants 
      // Make sure to set the promise back to undefined once resolved
      this.#promiseForMoreParticipants = undefined 
    }
    // Save the status in case participants leave and we switch to waiting for more participants
    // Once enough new participants join we can display the previous status again
    this.#previousStatus = "UPDATING MODEL"
    this.emit("status", this.#previousStatus)

    // Send our local contribution to the server
    // and receive the server global update for this round as an answer to our contribution
    const payloadToServer: WeightsContainer = this.aggregator.makePayloads(weights).first()
    const msg: messages.SendPayload = {
      type: type.SendPayload,
      payload: await serialization.weights.encode(payloadToServer),
      round: this.aggregator.round,
    };

    // Need to await the resulting global model right after sending our local contribution
    // to make sure we don't miss it
    debug(`[${this.ownId.slice(0, 4)}] sent its local update to the server for round ${this.aggregator.round}`);
    this.server.send(msg);
    debug(`[${this.ownId.slice(0, 4)}] is waiting for server update for round ${this.aggregator.round + 1}`);
    const {
      payload: payloadFromServer,
      round: serverRound,
      nbOfParticipants
    } = await waitMessage( this.server, type.ReceiveServerPayload); // Wait indefinitely for the server update
    
    this.#nbOfParticipants = nbOfParticipants // Save the current participants
    const serverResult = serialization.weights.decode(payloadFromServer);
    this.aggregator.setRound(serverRound);

    return serverResult
  }
}
