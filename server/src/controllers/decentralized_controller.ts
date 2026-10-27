import createDebug from "debug";
import * as msgpack from "@msgpack/msgpack";
import type WebSocket from "ws";
import { Map, Set } from "immutable";

import type { DataType, NodeID } from "@epfml/discojs";
import { mtype, decentralizedMessages } from "@epfml/discojs";

import { TrainingController } from "./training_controller.js";

import messages = decentralizedMessages;
import MessageTypes = mtype.MType;

const debug = createDebug("server:controllers:decentralized");

/**
 * Decentralized training server for a single task.
 *
 * Six variables track participants at different stages.
 *
 * - `clientIds` (inherited): connection between an ID and an open WebSocket.
 *   It is only used to guarantee ids don't collide.
 * - `connections` (inherited): map between the ids of clients
 *   that completed the connection handshake and their socket.
 * - `#roundPeers`: the nodes that want to join the current round and their readiness status.
 * - `#connectFinishedNodes`: the nodes that have completed the connection handshake and are ready for the current round.
 * - `#syncingNodes`: the nodes that are currently syncing with the latest model.
 * - `#providerNode`: the client selected to provide the latest model to peers joining in the middle of training.
 *
 */
export class DecentralizedController<
  D extends DataType,
> extends TrainingController<D, "decentralized"> {
  // Map of nodes who want to join the round.
  // The boolean value indicates if the node is ready to exchange weight updates (i.e.
  // the node has already sent a PeerIsReady message)
  // We wait for all peers to be ready to exchange weight updates
  #roundPeers = Map<NodeID, boolean>();
  #connectFinishedNodes = Map<NodeID, boolean>();
  #aggregationRound = 0;
  #timeout?: NodeJS.Timeout;

  // number of connection retries for the training round
  #connectionRetry = 0;

  // Client selected to provide the latest model to peers
  // joining in the middle of training
  #providerNode?: NodeID;

  // Set of nodes that are syncing node
  #syncingNodes = Set<NodeID>();

  handle(ws: WebSocket): void {
    const minNbOfParticipants =
      this.task.trainingInformation.minNbOfParticipants;

    // Generate a new unique client ID for the participant
    const peerId = this.newClientId();
    const shortId = peerId.slice(0, 4);

    // How the server responds to messages
    ws.on("message", (data: Buffer) => {
      try {
        const msg: unknown = msgpack.decode(data);
        if (!messages.isMessageToServer(msg)) {
          this.crashClient(ws, peerId, "Invalid message received");
          return debug("invalid message received: %o", msg);
        }
        // If the client has not yet established a connection
        // and the message is not a ClientConnected message,
        // we consider it as coming from an unconnected client
        // and respond with a CrashClient message.
        if (
          !this.connections.has(peerId) &&
          msg.type !== MessageTypes.ClientConnected
        ) {
          debug(
            "Received message from an unconnected client [%s], sending CrashClient message",
            shortId,
          );
          this.crashClient(ws, peerId, "No ClientConnected message received");
          return;
        }

        switch (msg.type) {
          // A new peer joins the network for a task
          case MessageTypes.ClientConnected: {
            // Verify if this is a new client connection
            const isNewClient = !this.connections.has(peerId);
            if (!isNewClient) {
              debug(
                `Duplicate client connection detected for client [%s]`,
                shortId,
              );
            } else {
              debug(`New client connection for client [%s]`, shortId);
              // Connect the new client to both the connections map and the aggregator
              this.connectClient(peerId, ws);
            }

            // Count the client's join attempt
            // Send crash message if it exceeded the maximum number of connection attempts
            if (!this.countJoinAttempt(peerId)) {
              debug(
                "Client [%s] exceeded the maximum number of connections (%d), sending CrashClient message",
                shortId,
                TrainingController.MAX_CLIENT_CONNECTION_RETRY,
              );
              this.crashClient(
                ws,
                peerId,
                "Exceeded maximum number of retries to connect",
              );
              return;
            }

            // Answer with client id in an NewNodeInfo message
            const msg: messages.NewDecentralizedNodeInfo = {
              type: MessageTypes.NewDecentralizedNodeInfo,
              id: peerId,
              nbOfParticipants: this.connections.size,
              waitForMoreParticipants:
                this.connections.size < minNbOfParticipants,
              joinedMidTraining: this.#syncingNodes.has(peerId),
            };
            this.send(ws, peerId, msgpack.encode(msg));

            // Send an update to participants if we can start/resume training,
            // which already carries the number of participants
            if (isNewClient && !this.sendEnoughParticipantsMsgIfNeeded(peerId))
              // otherwise just tell them that someone joined
              this.sendParticipantsUpdateMsg(peerId);
            break;
          }
          // Send by peers at the beginning of each training round to notify
          // the server that they want to join the round
          case MessageTypes.JoinRound: {
            this.#syncingNodes = this.#syncingNodes.delete(peerId);
            this.#roundPeers = this.#roundPeers.set(peerId, false);
            break;
          }
          // Send by peers when they are ready to exchange weight updates to get the list
          // of active peers for this round.
          case MessageTypes.PeerIsReady: {
            this.#roundPeers = this.#roundPeers.set(peerId, true);
            debug("Received peer ready from: %o", shortId);
            this.#sendPeersForRoundIfNeeded();
            break;
          }
          // Forwards a peer's message to another destination peer
          // Used to exchange peer's information and establish a direct
          // WebRTC connection between them
          case MessageTypes.SignalForPeer: {
            const forward: messages.SignalForPeer = {
              type: MessageTypes.SignalForPeer,
              peer: peerId,
              signal: msg.signal,
            };
            try {
              this.#sendMessageToNode(msg.peer, forward);
            } catch (err) {
              debug(
                "Failed to forward signal to node [%s]: %o",
                msg.peer.slice(0, 4),
                err,
              );
            }
            break;
          }
          case MessageTypes.ConnectionsReady: {
            // Select the first client that finishes peer connections
            // as the model provider for clients joined mid-training
            const numconnFinishedNodes = this.#connectFinishedNodes.reduce(
              (acc, val) => acc + (val ? 1 : 0),
              0,
            );
            if (!numconnFinishedNodes) {
              this.#providerNode = peerId;
            }

            this.#connectFinishedNodes = this.#connectFinishedNodes.set(
              peerId,
              true,
            );
            this.#signalWeightSharing();
            break;
          }
          case MessageTypes.ModelSyncRequest: {
            // Upon receiving a model sync request, send relevant client information
            // to both the model provider and the newly joined client
            if (!this.#providerNode) {
              debug("There is no provider node to share the latest model");
              break;
            }

            // Signal the newly joined client with the provider client's information
            const providerInfo: messages.ModelProviderInfo = {
              type: MessageTypes.ModelProviderInfo,
              providerNode: this.#providerNode,
            };
            try {
              this.#sendMessageToNode(peerId, providerInfo);
            } catch (err) {
              debug(
                "Failed to send provider info to node [%s]: %o",
                peerId.slice(0, 4),
                err,
              );
            }

            // Signal the provider client with newly joined client's information
            const newNodeInfo: messages.ProvideModelToPeer = {
              type: MessageTypes.ProvideModelToPeer,
              newNode: peerId,
            };
            try {
              this.#sendMessageToNode(this.#providerNode, newNodeInfo);
            } catch (err) {
              debug(
                "Failed to send new node info to provider node [%s]: %o",
                this.#providerNode.slice(0, 4),
                err,
              );
            }
            break;
          }
          default: {
            const _: never = msg;
            throw new Error("should never happen");
          }
        }
      } catch (e) {
        debug("when processing WebSocket message: %o", e);
        this.crashClient(ws, peerId, "Server failed to handle a message");
      }
    });
    // Setup callback for client leaving the session
    ws.on("close", () => {
      // Remove the participant when the websocket is closed
      this.disconnectClient(peerId);

      // Reset the training session when all participants leave
      if (this.connections.size === 0) {
        debug(
          "All participants left. Resetting decentralized training session",
        );
        this.reset();
        return;
      }

      debug("client [%s] left", shortId);

      // If this participant was a latest model provider node,
      // replace the provider node to another node and make sure this node is not newly joined node
      if (this.#providerNode === peerId) {
        this.#providerNode = this.connections
          .keySeq()
          .find((nodeId) => !this.#syncingNodes.has(nodeId));
      }

      // Check if we are already waiting for new participants to join
      if (this.waitingForMoreParticipants) {
        // tell the remaining participants that one of them left
        this.sendParticipantsUpdateMsg();
        return;
      }
      // If no, check if we are still above the minimum number of participant required
      if (this.connections.size >= minNbOfParticipants) {
        this.sendParticipantsUpdateMsg();
        this.#sendPeersForRoundIfNeeded();
        return;
      }
      // If we are below the minimum number of participants
      // tell remaining participants to wait until more participants join,
      // which already carries the number of participants
      this.sendWaitForMoreParticipantsMsg();
    });

    // Setup callback for WebSocket errors
    ws.on("error", (err) => {
      this.disconnect(ws, peerId, err);
    });
  }

  protected override reset(): void {
    super.reset();

    this.#roundPeers = Map<NodeID, boolean>();
    this.#connectFinishedNodes = Map<NodeID, boolean>();
    this.#aggregationRound = 0;
    this.#connectionRetry = 0;
    this.#providerNode = undefined;
    this.#syncingNodes = Set<NodeID>();

    // Reset the timeout
    if (this.#timeout !== undefined) {
      clearTimeout(this.#timeout);
      this.#timeout = undefined;
    }
  }

  #sendMessageToNode(
    nodeId: NodeID,
    message: messages.MessageFromServer,
  ): void {
    const conn = this.connections.get(nodeId);
    if (conn === undefined) {
      throw new Error(`No connection to node ${nodeId}, cannot send message`);
    }
    this.send(conn, nodeId, msgpack.encode(message));
  }

  #broadcastMessageToNodes(
    nodeIds: Iterable<NodeID>,
    createMessage: (nodeId: NodeID) => messages.MessageFromServer,
  ): void {
    for (const nodeId of nodeIds) {
      this.#sendMessageToNode(nodeId, createMessage(nodeId));
    }
  }

  /**
   * Check if we have enough participants to start the training
   * and if all peers that joined the round are ready to exchange weight updates
   * If so, send the list of peers for this round to all participants
   */
  #sendPeersForRoundIfNeeded(): void {
    const minNbOfParticipants =
      this.task.trainingInformation.minNbOfParticipants;
    const nbOfPeersReady = this.#roundPeers.filter((ready) => ready).size;
    // participating peers are connected peers expect the ones that are in process of syncing
    const participatingPeers = this.connections
      .keySeq()
      .toSet()
      .subtract(this.#syncingNodes);

    // First check if there are enough participants to start the round
    // Then check if all peers that wanted to join this round are ready
    // All peers that are connected to the server (except for newly joining peers waiting for the latest model)
    // are expected to participate in the round

    if (
      nbOfPeersReady < minNbOfParticipants ||
      nbOfPeersReady != participatingPeers.size
    )
      return;
    // Once every peer that joined the round is ready, we can start the round
    this.#broadcastMessageToNodes(
      this.#roundPeers.keySeq(),
      (id): messages.PeersForRound => {
        debug("Sending peer list to: %o", id.slice(0, 4));

        return {
          type: MessageTypes.PeersForRound,
          peers: this.#roundPeers.delete(id).keySeq().toArray(),
          aggregationRound: this.#aggregationRound,
          nbOfParticipants: this.connections.size,
        };
      },
    );

    // Initialize connectFinishedNodes with all peers set to false
    this.#connectFinishedNodes = this.#roundPeers.map(() => false);
    // Change the peer states to not ready
    this.#roundPeers = this.#roundPeers.map(() => false);

    // Start timeout to check peer connections are successful
    this.#startTimeout();
  }

  /**
   * Check if all the participants of the round finished connecting
   * with other peers in the round
   * If so, send StartWeightSharing message to signal peers to proceed
   */
  #signalWeightSharing(): void {
    // Return if not all participants are ready
    if (!this.#connectFinishedNodes.every((ready) => ready)) return;

    // Stop the timeout
    this.#clearTimeout();
    // Reset the connection retry count
    this.#connectionRetry = 0;

    // Send round participants StartWeightSharing messages
    this.#broadcastMessageToNodes(
      this.#roundPeers.keySeq(),
      (id): messages.StartWeightSharing => {
        debug("Signaling weight sharing to: %o", id.slice(0, 4));

        return {
          type: MessageTypes.StartWeightSharing,
        };
      },
    );

    // empty the list of peers for the next round
    this.#roundPeers = Map();
    this.#connectFinishedNodes = Map();
    this.#aggregationRound++;
  }

  /**
   * Set a timeout to check peer connections establishment
   */
  #startTimeout(
    maxTime: number = this.task.trainingInformation.maxPeerConnectionTime,
  ): void {
    // Cancel the previous timeout if it exists
    this.#clearTimeout();

    this.#timeout = setTimeout(() => {
      this.#handleTimeout();
    }, maxTime);
  }

  /**
   * Clear previously set timeout once all peer connections
   * are established before the timeout
   */
  #clearTimeout(): void {
    if (this.#timeout !== undefined) {
      clearTimeout(this.#timeout);
      this.#timeout = undefined;
    }
  }

  /**
   * Called when a timeout occurs during peer connection
   * Signals peers to discard existing connections and
   * reestablish connections with the current set of peers
   */
  #handleTimeout(): void {
    this.#clearTimeout();
    debug(
      `Connection setup timeout for round ${this.#aggregationRound}, Retrying with same peers`,
    );
    // Increment the connection retry count
    this.#connectionRetry += 1;

    // If the number of retries exceeds the threshold, exclude the failed peers from the round
    // and retry peer connection only with the remaining peers
    if (
      this.#connectionRetry > this.task.trainingInformation.maxConnectionRetry
    ) {
      // Exclude the failed peers
      this.#connectFinishedNodes.forEach((connected, nodeId) => {
        if (!connected) {
          // If the node failed connection, exclude from #roundPeers
          this.#roundPeers = this.#roundPeers.delete(nodeId);
          this.#connectFinishedNodes =
            this.#connectFinishedNodes.delete(nodeId);
          // Signal the node that connection is failed for that node
          debug("Signaling connection failure to: %o", nodeId.slice(0, 4));

          this.#sendMessageToNode(nodeId, {
            type: MessageTypes.ConnectionFail,
          });
        }
      });

      // Restart the round with remaining clients
      this.#broadcastMessageToNodes(
        this.#roundPeers.keySeq(),
        (id): messages.RetryPeerConnections => {
          debug("Signaling connection retry to: %o", id.slice(0, 4));

          return {
            type: MessageTypes.RetryPeerConnections,
          };
        },
      );

      // Reset the ready and connection status of roundPeers
      this.#roundPeers = this.#roundPeers.map(() => false);
      this.#connectFinishedNodes = this.#roundPeers.map(() => false);

      // Reset the connectionRetry since we excluded the failed clients
      this.#connectionRetry = 0;

      return;
    }

    // Retry peer connection with original roundPeers
    // Reset the ready and connection status of roundPeers
    this.#roundPeers = this.#roundPeers.map(() => false);
    this.#connectFinishedNodes = this.#roundPeers.map(() => false);

    this.#broadcastMessageToNodes(
      this.#roundPeers.keySeq(),
      (id): messages.RetryPeerConnections => {
        debug("Signaling connection retry to: %o", id.slice(0, 4));

        return {
          type: MessageTypes.RetryPeerConnections,
        };
      },
    );
  }

  protected override connectClient(nodeId: string, ws: WebSocket): void {
    super.connectClient(nodeId, ws);

    // If the new peer joins in the middle of training,
    // it needs to get the latest model from an existing peer
    if (this.#aggregationRound > 0) {
      this.#syncingNodes = this.#syncingNodes.add(nodeId);
    }
  }

  protected override disconnectClient(nodeId: string): void {
    super.disconnectClient(nodeId);

    this.#roundPeers = this.#roundPeers.delete(nodeId);
    this.#connectFinishedNodes = this.#connectFinishedNodes.delete(nodeId);
    this.#syncingNodes = this.#syncingNodes.delete(nodeId);
  }
}
