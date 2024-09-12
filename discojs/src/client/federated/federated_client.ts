import createDebug from "debug";

import { serialization } from "../../index.js";
import type { Model, WeightsContainer } from "../../index.js";
import { Client } from "../client.js";
import { type, type ClientConnected } from "../messages.js";
import {
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

  // the number of participants excluding the server
  override get nbOfParticipants(): number {
    return this.#nbOfParticipants
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
    // Opens a new WebSocket connection with the server and listens to new messages over the channel
    this._server = await WebSocketServer.connect(
      serverURL,
      messages.isMessageFederated, // can only receive federated message types from the server
      messages.isMessageFederated, // idem for messages that the client can send
    );

    // c.f. setupServerCallbacks doc for explanation
    let receivedEnoughParticipants = false
    this.setupServerCallbacks(() => receivedEnoughParticipants = true)

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
      this.promiseForMoreParticipants = this.createPromiseForMoreParticipants()
    }
    if (this._ownId !== undefined) {
      throw new Error('received id from server but was already received')
    }
    this._ownId = id;
    debug(`[${this.shortId(id)}] joined session at round ${round} `);
    this.aggregator.setRound(round)
    this.#nbOfParticipants = nbOfParticipants
    // Upon connecting, the server answers with a boolean
    // which indicates whether there are enough participants or not
    debug(`[${this.shortId(this.ownId)}] upon connecting, wait for participant flag %o`, this.waitingForMoreParticipants)
    model.weights = serialization.weights.decode(payload)
    return model
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
    this.saveAndEmit("TRAINING")
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
    await this.checkIfWaitForParticipants()
    this.saveAndEmit("UPDATING MODEL")
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
    debug(`[${this.shortId(this.ownId)}] sent its local update to the server for round ${this.aggregator.round}`);
    this.server.send(msg);
    debug(`[${this.shortId(this.ownId)}] is waiting for server update for round ${this.aggregator.round + 1}`);
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
