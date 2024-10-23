import createDebug from "debug";
import type WebSocket from 'ws'
import { Map } from 'immutable'
import msgpack from 'msgpack-lite'

import { client } from '@epfml/discojs'
import type { DataType, Task } from "@epfml/discojs";

const debug = createDebug("server:controllers")

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
export abstract class TrainingController<D extends DataType> {
  /**
   * Boolean used to know if we have enough participants to train or if 
   * we should be waiting for more
   */
  protected waitingForMoreParticipants = true
  /**
   * List of active participants along with their websockets
   * the list allows updating participants about the training status 
   * i.e. waiting for more participants or resuming training
   */
  protected connections = Map<client.NodeID, WebSocket>()

  constructor(protected readonly task: Task<D>) {}

  abstract handle(
    ws: WebSocket
  ): void

  /**
   * If enough participants joined, notifies them that the training can start/resume
   * 
   * @param currentId the id of the participant that just joined
   */
  protected sendEnoughParticipantsMsgIfNeeded(currentId: client.NodeID) {
    // If we are currently waiting for more participants to join and we now have enough,
    // broadcast to previously waiting participants that the training can start
    if (this.waitingForMoreParticipants &&
      this.connections.size >= this.task.trainingInformation.minNbOfParticipants) {
      this.connections
        // filter out the client that just joined as 
        // it already knows via the NewFederatedNodeInfo message
        .delete(currentId)
        .forEach((participantWs, participantId) => {
          debug("Sending enough-participant message to client [%s]", participantId.slice(0, 4))
          const msg: client.messages.EnoughParticipants = {
            type: client.messages.type.EnoughParticipants
          }
          participantWs.send(msgpack.encode(msg))
        })
      this.waitingForMoreParticipants = false // update the attribute
    }
  }

  /**
   * Notifies participant that the number of participants drops below the minimum threshold
   */
  protected sendWaitForMoreParticipantsMsg(): void {
    // If we are below the minimum number of participants
    // tell remaining participants to wait until more participants join
    this.waitingForMoreParticipants = true
    this.connections
      .forEach((participantWs, participantId) => {
        debug("Telling remaining client [%s] to wait for participants", participantId.slice(0, 4))
        const msg: client.messages.WaitingForMoreParticipants = {
          type: client.messages.type.WaitingForMoreParticipants
        }
        participantWs.send(msgpack.encode(msg))
      })
  }

}
