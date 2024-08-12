import createDebug from "debug";

import {
  serialization,
  type WeightsContainer,
} from "../../index.js";
import { Base as Client } from "../base.js";
import { type, type ClientConnected, type ClientDisconnected } from "../messages.js";
import {
  type EventConnection,
  waitMessageWithTimeout,
  waitMessage,
  WebSocketServer,
} from "../event_connection.js";
import * as messages from "./messages.js";

const debug = createDebug("discojs:client:federated");

/**
 * Client class that communicates with a centralized, federated server, when training
 * a specific task in the federated setting.
 */
export class Base extends Client {
  /**
   * Arbitrary node id assigned to the federated server which we are communicating with.
   * Indeed, the server acts as a node within the network. In the federated setting described
   * by this client class, the server is the only node which we are communicating with.
   */
  public static readonly SERVER_NODE_ID = "federated-server-node-id";
  
  // Total number of other federated contributors, including this client, excluding the server
  // E.g., if 3 users are training a federated model, nbOfParticipants is 3
  #nbOfParticipants: number = 1;

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
      messages.isMessageFederated,
      messages.isMessageFederated,
    );

    return server;
  }

  /**
   * Initializes the connection to the server and get our own node id.
   * TODO: In the federated setting, should return the current server-side round
   * for the task.
   */
  async connect(): Promise<void> {
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

    serverURL.pathname += `feai/${this.task.id}`;

    this._server = await this.connectServer(serverURL);
    this.aggregator.registerNode(Base.SERVER_NODE_ID);

    const msg: ClientConnected = {
      type: type.ClientConnected,
    };
    this.server.send(msg);

    const received = await waitMessageWithTimeout(
      this.server,
      type.AssignNodeID,
    );
    debug(`[${received.id}] assign id generated by the server`);
    this._ownId = received.id;
    if (received.waitForMoreParticipants) {
      // Do nothing for now
      // await waitMessage(this.server, type.PeerIsReady)
    }
  }

  /**
   * Disconnection process when user quits the task.
   */
  override async disconnect(): Promise<void> {
    const msg: ClientDisconnected = {
      type: type.ClientDisconnected,
    };
    this.server.send(msg); // notify the server we are disconnecting but don't wait for an answer
    await this.server.disconnect();
    this._server = undefined;
    this._ownId = undefined;

    this.aggregator.setNodes(this.aggregator.nodes.delete(Base.SERVER_NODE_ID));

    return Promise.resolve();
  }

  override onRoundBeginCommunication(): Promise<void> {
    // Prepare the result promise for the incoming round
    this.aggregationResult = new Promise((resolve) => this.aggregator.once('aggregation', resolve))
    return Promise.resolve();
  }

  /**
   * 
   * @param weights Local weights sent to the server at the end of the local training round
   * @param _round The trainer's aggregation round, which can be different from 
   * the server's round if the participant joined late
   * @returns the new global weights sent by the server
   */
  override async onRoundEndCommunication(weights: WeightsContainer): Promise<WeightsContainer> {
    // NB: For now, we suppose a fully-federated setting.

    if (this.aggregationResult === undefined) {
      throw new Error("local aggregation result was not set");
    }

    // Send our local contribution to the server
    // and receive the most recent weights as an answer to our contribution
    const payload: WeightsContainer = this.aggregator.makePayloads(weights).first()
    const msg: messages.SendPayload = {
      type: type.SendPayload,
      payload: await serialization.weights.encode(payload),
      round: this.aggregator.round,
    };

    // Need to await the resulting global model right after sending our local contribution
    // to make sure we don't miss it
    this.server.send(msg);
    const serverResult = await this.receiveServerResult();

    if (
      serverResult !== undefined &&
      this.aggregator.add(Base.SERVER_NODE_ID, serverResult, this.aggregator.round)
    ) {
      // Regular case: the server sends us its aggregation result which will serve our
      // own aggregation result.
    } else {
      // Unexpected case: for some reason, the server result is stale.
      debug(`[${this.ownId}] server result for round ${this.aggregator.round} is undefined or stale`);
      // We proceed to the next round without its result.
      this.aggregator.nextRound();
    }
    return await this.aggregationResult
  }

  /**
   * Wait for the server to reply with the most recent aggregated weights
   * after having sent out local weight update to the federated server
   */
  private async receiveServerResult(): Promise<WeightsContainer | undefined> {
    // Try receiving the latest update multiple times in case we receive outdated updates
    const MAX_NB_OF_TRIES = 3
    for (let nbOfTries = 0; nbOfTries < MAX_NB_OF_TRIES; nbOfTries++) {
      try {
        const { payload, round: serverRound, nbOfParticipants } = await waitMessageWithTimeout(
          this.server,
          type.ReceiveServerPayload,
          undefined,
          "Timeout while waiting for the server's model update"
        );
        
        // Store the server result only if it is not stale
        if (this.aggregator.round <= serverRound) {
          this.#nbOfParticipants = nbOfParticipants // Save the current participants
          const serverResult = serialization.weights.decode(payload);
          // Updates the aggregator's round if it's behind the server's.
          if (this.aggregator.round < serverRound) {
            this.aggregator.setRound(serverRound);
          }
          return serverResult;
        }
      } catch (e) {
        debug(`Error during try ${nbOfTries} of receiving server result: %o`, e);
      }
    }
    console.error(`Failed to receive server result in ${MAX_NB_OF_TRIES} tries`)
    return undefined // don't return anything if we failed
  }
}
