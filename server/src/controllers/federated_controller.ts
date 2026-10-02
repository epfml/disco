import createDebug from "debug";
import type WebSocket from "ws";
import { v4 as randomUUID } from "uuid";
import * as msgpack from "@msgpack/msgpack";

import type { DataType, Task, Encoded, NodeID } from "@epfml/discojs";
import {
  mtype,
  federatedMessages,
  weightsEncode,
  weightsDecode,
  MeanAggregator,
} from "@epfml/discojs";

import { TrainingController } from "./training_controller.js";

import MessageTypes = mtype.MType;

const debug = createDebug("server:controllers:federated");

/**
 * Federated training server for a single task.
 *
 * Four variables track participants at different stages.
 *
 * - `#clientIds`: connection between an ID and an open WebSocket.
 *   It is only used to guarantee ids don't collide.
 * - `connections` (inherited): map between the ids of clients
 *   that completed the connection handshake and their socket.
 *   This is the set of active participants in the current round.
 * - `#aggregator.nodes`: the group of nodes that the aggregator expects
 *   contributions from. It decides when a round is completed
 *   (`threshold * nodes.size`) and whether a contribution is valid.
 * - `#pendingUpdateRecipients`: the clients whose contribution was accepted for
 *   the current round, reset after each aggregation.
 *   It is a subset of `connections` that participated in the current round.
 *
 * Lifetime asymmetry: `reset()` clears `connections` and rebuilds the
 * aggregator, but deliberately leaves `#clientIds` intact. Those sockets may
 * still be open, and their ids must stay reserved to avoid collisions.
 */
export class FederatedController<D extends DataType> extends TrainingController<
  D,
  "federated"
> {
  /**
   * WebSockets of clients whose update was accepted for the current round.
   * They receive the resulting global weights when aggregation completes.
   */
  #pendingUpdateRecipients = new Map<NodeID, WebSocket>();
  /**
   * Aggregators for each hosted task.
    By default the server waits for 100% of the nodes to send their contributions before aggregating the updates
   */
  #aggregator = this.#makeAggregator();
  /**
   * The most up to date global weights. The model weights are already serialized and
   * can be sent to participants, before starting training, or when joining mid-training
   * or staled participants
   */
  #latestGlobalWeights: Encoded;
  /**
   * Complete list of client ids that have connected their websocket
   * Make sure two clients don't share the same ID.
   */
  #clientIds = new Set<NodeID>();

  constructor(
    task: Task<D, "federated">,
    private readonly initialWeights: Encoded,
  ) {
    super(task);
    this.#latestGlobalWeights = this.initialWeights;
  }

  /**
   * Creates an aggregator and registers the handler that caches and broadcasts
   * the global weights produced at the end of each aggregation round.
   */
  #makeAggregator(): MeanAggregator {
    const aggregator = new MeanAggregator(0, 1, "relative");

    // Set the minimum number of participants required for aggregation
    // In case we recreate the aggregator after a reset
    aggregator.minNbOfParticipants =
      this.task.trainingInformation.minNbOfParticipants;

    aggregator.on("aggregation", async (weightUpdate) => {
      try {
        const payload = await weightsEncode(weightUpdate);
        // Check if a this.reset() has been called in the meantime
        //  which recreates the aggregator
        if (this.#aggregator !== aggregator) return;
        const recipients = this.#pendingUpdateRecipients;
        this.#pendingUpdateRecipients = new Map();

        debug(
          "round %o aggregate payload byteLength=%d",
          aggregator.round,
          payload.byteLength,
        );
        this.#latestGlobalWeights = payload;

        const msg: federatedMessages.ReceiveServerPayload = {
          type: MessageTypes.ReceiveServerPayload,
          round: aggregator.round,
          payload,
          nbOfParticipants: this.connections.size,
        };
        const encodedMsg = msgpack.encode(msg);

        recipients.forEach((recipientWs, recipientId) => {
          try {
            debug(
              "Sending global weights for round %o to client [%s]",
              aggregator.round,
              recipientId.slice(0, 4),
            );
            recipientWs.send(encodedMsg);
            debug(
              "Aggregated payload sent to client [%s] for round %o",
              recipientId.slice(0, 4),
              aggregator.round,
            );
          } catch (err) {
            debug(
              "Failed to send global weights for round %o to client [%s]: %o",
              aggregator.round,
              recipientId.slice(0, 4),
              err,
            );
          }
        });
      } catch (err) {
        debug(
          "Failed to serialize or encode weights for round %o: %o",
          aggregator.round,
          err,
        );
      } finally {
        weightUpdate.dispose();
      }
    });

    return aggregator;
  }

  /**
   * This is the main logic of the federated server. This method is called only once per
   * websocket connection (i.e. each participant) along with the associated task.
   * It registers what the server will do upon receiving messages from the participant.
   * Note that `this.handle` is only called once to setup the logic. It is `ws.on()`
   * that is called upon receiving messages (and not `this.handle`)
   *
   * @param task the task associated with the current websocket (= participant)
   * @param ws the websocket connection through which the participant and the server communicate
   */
  handle(ws: WebSocket): void {
    const minNbOfParticipants =
      this.task.trainingInformation.minNbOfParticipants;
    // Try generating a new Client id until there no collision with existing ones
    let clientId = randomUUID();
    while (this.#clientIds.has(clientId)) {
      clientId = randomUUID();
    }
    this.#clientIds.add(clientId);
    const shortId = clientId.slice(0, 4);

    ws.on("error", (err) => {
      debug("websocket error for client [%s]: %o", shortId, err);
    });

    // Setup callbacks triggered upon receiving the different client messages
    ws.on("message", (data: Buffer) => {
      const msg: unknown = msgpack.decode(data);
      if (!federatedMessages.isMessageToServer(msg)) {
        debug("invalid federated message received on WebSocket: %o", msg);
        return; // TODO send back error
      }

      // If the client has not yet established a connection
      // and the message is not a ClientConnected message,
      // we consider it as coming from an unconnected client
      // and respond with a MissingConnection message.
      if (
        !this.connections.has(clientId) &&
        msg.type !== MessageTypes.ClientConnected
      ) {
        debug(
          "Received message from an unconnected client [%s], sending MissingConnection message",
          shortId,
        );
        ws.send(
          msgpack.encode({
            type: MessageTypes.MissingConnection,
          }),
        );
        return;
      }

      // Currently expect two types of message:
      // - the client connects to the task
      // - the client sends a weight update
      switch (msg.type) {
        /*
         * A new participant joins the task
         */
        case MessageTypes.ClientConnected: {
          // Verify if this is a new client connection
          const isNewClient = !this.connections.has(clientId);
          if (!isNewClient) {
            debug(
              `Duplicate client connection detected for client [%s]`,
              shortId,
            );
          } else {
            debug(`New client connection for client [%s]`, shortId);
            // Connect the new client to both the connections map and the aggregator
            this.#connectClient(clientId, ws);
          }

          // Send the new federated node info to the client in both cases (new or duplicate connection)
          const msg: federatedMessages.NewFederatedNodeInfo = {
            type: MessageTypes.NewFederatedNodeInfo,
            id: clientId,
            waitForMoreParticipants:
              this.connections.size < minNbOfParticipants,
            payload:
              this.#aggregator.round === 0
                ? undefined // Optimization: no needs to send the initial weights, the client already has them
                : this.#latestGlobalWeights,
            round: this.#aggregator.round,
            nbOfParticipants: this.connections.size,
          };
          ws.send(msgpack.encode(msg));

          // Send an update to participants if we can start/resume training,
          // which already carries the number of participants
          // Only for new clients, as they would receive it twice otherwise
          if (isNewClient && !this.sendEnoughParticipantsMsgIfNeeded(clientId))
            // otherwise just tell them that someone joined
            this.sendParticipantsUpdateMsg(clientId);
          break;
        }
        /*
         * A client sends a weight update to the server
         */
        case MessageTypes.SendPayload: {
          const { payload, round } = msg;
          // This case should generally not happen under normal operation,
          // as clients should only contribute to the current round
          // and have no way to be ahead of the server's current round
          // We notify the client to crash in this case
          if (this.#aggregator.round < round) {
            debug(
              "Received contribution from client [%s] for future round %d (current round=%d)",
              shortId,
              round,
              this.#aggregator.round,
            );
            // Send a notification to crash to the client
          } else if (this.#aggregator.isValidContribution(clientId, round)) {
            debug(
              "Received valid contribution from client [%s] for round %d (participants=%d)",
              shortId,
              round,
              this.connections.size,
            );
            const weights = weightsDecode(payload);
            let added = false;
            try {
              // Add the contribution
              debug(
                "Adding contribution from client [%s] to aggregator for round %d",
                shortId,
                round,
              );
              this.#pendingUpdateRecipients.set(clientId, ws);
              this.#aggregator.add(clientId, weights, round);
              added = true;
              debug(
                `Successfully added contribution from client [%s] for round ${round}`,
                shortId,
              );
            } finally {
              weights.dispose();
              if (!added) this.#pendingUpdateRecipients.delete(clientId);
            }
          } else {
            // If the client sent an invalid or outdated contribution
            // the server answers with the current round and last global model update
            debug(
              `Dropped contribution from client [%s] for round ${round} ` +
                `Sending last global model from current round ${this.#aggregator.round}`,
              shortId,
            );

            const msg: federatedMessages.ReceiveServerPayload = {
              type: MessageTypes.ReceiveServerPayload,
              round: this.#aggregator.round,
              payload: this.#latestGlobalWeights,
              nbOfParticipants: this.connections.size,
            };
            ws.send(msgpack.encode(msg));
          }
          break;
        }
      }
    });

    // Setup callback for client leaving the session
    ws.on("close", () => {
      // Remove the participant when the websocket is closed
      this.#disconnectClient(clientId);

      debug("client [%s] left", shortId);

      // Reset the training session when all participants left
      if (this.connections.size === 0) {
        debug("All participants left. Resetting the training session");
        this.reset();
      }

      // Check if we dropped below the minimum number of participant required
      // or if we are already waiting for new participants to join
      if (
        this.connections.size >= minNbOfParticipants ||
        this.waitingForMoreParticipants
      ) {
        // tell the remaining participants that one of them left
        this.sendParticipantsUpdateMsg();
        return;
      }

      // tell remaining participants to wait until more participants join,
      // which already carries the number of participants
      this.sendWaitForMoreParticipantsMsg();
    });
  }

  reset(): void {
    this.resetConnectionState();
    this.#pendingUpdateRecipients.clear();
    // Dispose first before generating a new aggregator
    this.#aggregator.dispose();
    this.#aggregator = this.#makeAggregator();

    this.#latestGlobalWeights = this.initialWeights;
  }

  /**
   * Connects a new client to both the connections map and the aggregator.
   * Ensures consistency between the connections map and the aggregator.
   */
  #connectClient(clientId: string, ws: WebSocket): void {
    this.connections = this.connections.set(clientId, ws);
    this.#aggregator.registerNode(clientId);
  }

  /**
   * Disconnects a client from the connections map, the aggregator, and the pending update recipients set.
   * Ensures consistency between the sets
   */
  #disconnectClient(clientId: string): void {
    this.connections = this.connections.delete(clientId);
    this.#aggregator.removeNode(clientId);
    this.#pendingUpdateRecipients.delete(clientId);
    this.#clientIds.delete(clientId);
  }
}
