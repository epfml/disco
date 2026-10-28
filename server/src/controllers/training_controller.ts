import createDebug from "debug";
import type WebSocket from "ws";
import { Map } from "immutable";
import * as msgpack from "@msgpack/msgpack";
import { v4 as randomUUID } from "uuid";

import { mtype } from "@epfml/discojs";
import type { DataType, Network, Task, NodeID } from "@epfml/discojs";

const debug = createDebug("server:controllers");

/**
 * The Controller abstraction is commonly used in Express
 * and comes from the MVC pattern (model-view-controller)
 * In short, the controller is where the backend logic happens
 * when the server receives a client request
 *
 * In this case, the controller handles the training logic:
 * what happens when a new task (DISCOllaborative) is created
 * and what happens when receiving messages from participants
 * of a training session.
 *
 * More info on controllers:
 * https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/routes
 *
 */
export abstract class TrainingController<
  D extends DataType,
  N extends Exclude<Network, "local">,
> {
  /**
   * Boolean used to know if we have enough participants to train or if
   * we should be waiting for more
   */
  protected waitingForMoreParticipants = true;
  /**
   * List of active participants along with their websockets
   * the list allows updating participants about the training status
   * i.e. waiting for more participants or resuming training
   */
  protected connections = Map<NodeID, WebSocket>();
  /**
   * Complete list of client ids that have connected their websocket
   * Make sure two clients don't share the same ID.
   */
  protected clientIds = new Set<NodeID>();
  /**
   * Number of ClientConnected messages each client's socket sent.
   * We answer them with the global weights, so a client resending it
   * could make the server send them over and over.
   * By limiting the number of times a client can send the ClientConnected message, we prevent some abuse.
   * Note: It does not prevent a client from connecting with a different websocket and thus clientID.
   */
  protected clientCounters = Map<NodeID, number>();
  /**
   * Maximum number of times a client can try to connect with the same client ID.
   */
  static readonly MAX_CLIENT_CONNECTION_RETRY = 5;

  constructor(protected readonly task: Task<D, N>) {}

  abstract handle(ws: WebSocket): void;

  /**
   * Resets the state of the training controller.
   * Clears the connections and client counters.
   * Typically used when the training is finished or needs to be restarted.
   * Deliberately leaves `clientIds` intact. Those sockets may
   * still be open, and their ids must stay reserved to avoid future collisions.
   */
  protected reset(): void {
    this.waitingForMoreParticipants = true;
    this.connections = Map<NodeID, WebSocket>();
    this.clientCounters = Map<NodeID, number>();
  }

  /**
   * Notifies participants of how many of them there are.
   *
   * @param exclude a participant to leave out, typically one which just joined
   * and already learned the count from the answer to its join request
   */
  protected sendParticipantsUpdateMsg(exclude?: NodeID): void {
    const msg: mtype.ParticipantsUpdate = {
      type: mtype.MType.ParticipantsUpdate,
      nbOfParticipants: this.connections.size,
    };
    const encoded = msgpack.encode(msg);

    const recipients =
      exclude !== undefined
        ? this.connections.delete(exclude)
        : this.connections;
    recipients.forEach((participantWs, participantId) => {
      debug(
        "Sending participants update to client [%s]",
        participantId.slice(0, 4),
      );
      this.send(participantWs, participantId, encoded);
    });
  }

  /**
   * If enough participants joined, notifies them that the training can start/resume
   *
   * @param currentId the id of the participant that just joined
   * @returns whether the participants were notified, which also tells them the
   * number of participants
   */
  protected sendEnoughParticipantsMsgIfNeeded(currentId: NodeID): boolean {
    // If we are currently waiting for more participants to join and we now have enough,
    // broadcast to previously waiting participants that the training can start
    if (
      this.waitingForMoreParticipants &&
      this.connections.size >= this.task.trainingInformation.minNbOfParticipants
    ) {
      this.connections
        // filter out the client that just joined as
        // it already knows via the NewFederatedNodeInfo message
        .delete(currentId)
        .forEach((participantWs, participantId) => {
          debug(
            "Sending enough-participant message to client [%s]",
            participantId.slice(0, 4),
          );
          const msg: mtype.EnoughParticipants = {
            type: mtype.MType.EnoughParticipants,
            nbOfParticipants: this.connections.size,
          };
          this.send(participantWs, participantId, msgpack.encode(msg));
        });
      this.waitingForMoreParticipants = false; // update the attribute
      return true;
    }

    return false;
  }

  /**
   * Notifies participant that the number of participants drops below the minimum threshold
   */
  protected sendWaitForMoreParticipantsMsg(): void {
    // If we are below the minimum number of participants
    // tell remaining participants to wait until more participants join
    this.waitingForMoreParticipants = true;
    this.connections.forEach((participantWs, participantId) => {
      debug(
        "Telling remaining client [%s] to wait for participants",
        participantId.slice(0, 4),
      );
      const msg: mtype.WaitingForMoreParticipants = {
        type: mtype.MType.WaitingForMoreParticipants,
        nbOfParticipants: this.connections.size,
      };
      this.send(participantWs, participantId, msgpack.encode(msg));
    });
  }

  /**
   * Sends a message to a client, disconnecting it if the message can't be delivered
   */
  protected send(ws: WebSocket, clientId: NodeID, data: Uint8Array): void {
    try {
      ws.send(data, (err) => {
        if (err !== undefined && err !== null)
          this.disconnect(ws, clientId, err);
      });
    } catch (err) {
      this.disconnect(ws, clientId, err);
    }
  }

  /**
   * Tells a client to crash, then disconnects it once the message is sent.
   * The server doesn't rely on the client to disconnect itself, which it may
   * never do if it is faulty, while it keeps counting as a participant.
   */
  protected crashClient(ws: WebSocket, clientId: NodeID, reason: string): void {
    debug("crashing client [%s]: %s", clientId.slice(0, 4), reason);
    const msg: mtype.CrashClient = { type: mtype.MType.CrashClient, reason };
    try {
      // disconnect whether the message was delivered or not
      ws.send(msgpack.encode(msg), () => ws.terminate());
    } catch (err) {
      this.disconnect(ws, clientId, err);
    }
  }

  /**
   * Forcefully disconnects a client.
   * Its websocket "close" handler then removes it from the session, so that
   * the remaining participants don't wait for it.
   */
  protected disconnect(ws: WebSocket, clientId: NodeID, reason: unknown): void {
    debug("disconnecting client [%s]: %o", clientId.slice(0, 4), reason);
    ws.terminate();
  }

  /**
   * Counts a client's join attempt and determines if it is allowed to try joining again based on the maximum retry limit.
   * @param id the client ID for which to count the join attempt
   * @returns `true` if the client is allowed to attempt joining again, `false` if the maximum retry limit has been reached
   */
  protected countJoinAttempt(id: NodeID): boolean {
    const currentCount = this.clientCounters.get(id) ?? 0;
    if (currentCount >= TrainingController.MAX_CLIENT_CONNECTION_RETRY) {
      return false;
    }
    this.clientCounters = this.clientCounters.set(id, currentCount + 1);
    return true;
  }

  protected newClientId(): NodeID {
    let nodeId = randomUUID();
    while (this.clientIds.has(nodeId)) {
      nodeId = randomUUID();
    }
    this.clientIds.add(nodeId);
    return nodeId;
  }

  /**
   * Adds a client that completed the join handshake to the session.
   * Subclasses also add it to their own sets, calling super first.
   */
  protected connectClient(id: NodeID, ws: WebSocket): void {
    this.connections = this.connections.set(id, ws);
  }

  /**
   * Removes a client whose socket closed from the session and frees its id.
   * Subclasses also remove it from their own sets, calling super.
   */
  protected disconnectClient(id: NodeID): void {
    this.connections = this.connections.delete(id);
    this.clientCounters = this.clientCounters.delete(id);
    this.clientIds.delete(id);
  }
}
