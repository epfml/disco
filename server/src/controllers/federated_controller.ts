import createDebug from "debug";
import WebSocket from 'ws'
import { v4 as randomUUID } from 'uuid'
import msgpack from 'msgpack-lite'

import type { EncodedWeights, Task } from '@epfml/discojs'
import {
  aggregator as aggregators,
  client,
  serialization,
} from '@epfml/discojs'

import { TrainingController } from "./training_controller.js";

import MessageTypes = client.messages.type
import FederatedMessages = client.federated.messages

const debug = createDebug("server:controllers:federated")

export class FederatedController extends TrainingController {
  /**
   * Aggregators for each hosted task.
    By default the server waits for 100% of the nodes to send their contributions before aggregating the updates
   */
  #aggregator = new aggregators.MeanAggregator(undefined, 1, 'relative')
  /**
   * The most up to date global weights. The model weights are already serialized and 
   * can be sent to participants, before starting training, or when joining mid-training 
   * or staled participants
   */
  #latestGlobalWeights: EncodedWeights
  

  constructor(task: Task, initialWeights: EncodedWeights) {
    super(task)
    this.#latestGlobalWeights = initialWeights

    // Save the latest weight updates to be able to send it to new or outdated clients
    this.#aggregator.on('aggregation', async (weightUpdate) => {
      this.#latestGlobalWeights = await serialization.weights.encode(weightUpdate)
    })
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
    const minNbOfParticipants = this.task.trainingInformation.minNbOfParticipants
    this.#aggregator.minNbOfParticipants = minNbOfParticipants
    // Try generating a new Client id until there no collision with existing ones
    let clientId = randomUUID()
    while (!this.#aggregator.registerNode(clientId)) {
      clientId = randomUUID()
    }
    const shortId = clientId.slice(0, 4)

    // Setup callbacks triggered upon receiving the different client messages
    ws.on('message', (data: Buffer) => {
      const msg: unknown = msgpack.decode(data)
      if (!FederatedMessages.isMessageFederated(msg)) {
        debug("invalid federated message received on WebSocket: %o", msg);
        return // TODO send back error
      }

      // Currently expect two types of message: 
      // - the client connects to the task
      // - the client sends a weight update
      switch (msg.type) {
        /* 
        * A new participant joins the task 
        */
        case MessageTypes.ClientConnected: {
          debug(`client [%s] joined ${this.task.id}`, shortId)
          this.connections = this.connections.set(clientId, ws) // add the new client

          const msg: FederatedMessages.NewFederatedNodeInfo = {
            type: MessageTypes.NewFederatedNodeInfo,
            id: clientId,
            waitForMoreParticipants: this.connections.size < minNbOfParticipants,
            payload: this.#latestGlobalWeights,
            round: this.#aggregator.round,
            nbOfParticipants: this.connections.size
          }
          ws.send(msgpack.encode(msg))
          // Send an update to participants if we can start/resume training
          this.sendEnoughParticipantsMsgIfNeeded(clientId)
          break
        }
        /* 
        * A client sends a weight update to the server
        */
        case MessageTypes.SendPayload: {
          const { payload, round } = msg
          if (this.#aggregator.isValidContribution(clientId, round)) {
            const weights = serialization.weights.decode(payload)

            // Send the aggregated weight to the client when enough contributions are received
            this.#aggregator.add(clientId, weights)
              .then(async (weightUpdate) => {
                debug("Sending global weights for round %o to client [%s]", this.#aggregator.round, shortId)
                const msg: FederatedMessages.ReceiveServerPayload = {
                  type: MessageTypes.ReceiveServerPayload,
                  round: this.#aggregator.round, // send the current round number after aggregation
                  payload: await serialization.weights.encode(weightUpdate),
                  nbOfParticipants: this.connections.size
                }
                ws.send(msgpack.encode(msg))
              })
              .catch((e) => debug("while waiting for weights: %o", e))
            debug(`Successfully added contribution from client [%s] for round ${round}`, shortId)
          } else {
            // If the client sent an invalid or outdated contribution
            // the server answers with the current round and last global model update
            debug(`Dropped contribution from client [%s] for round ${round} ` +
              `Sending last global model from round ${this.#aggregator.round - 1}`, shortId)
            // no latest model at the first round
            if (this.#latestGlobalWeights === undefined) return
            
            const msg: FederatedMessages.ReceiveServerPayload = {
              type: MessageTypes.ReceiveServerPayload,
              round: this.#aggregator.round - 1, // send the model from the previous round
              payload: this.#latestGlobalWeights,
              nbOfParticipants: this.connections.size
            }
            ws.send(msgpack.encode(msg))
          }
          break
        }
      }
    })

    // Setup callback for client leaving the session
    ws.on('close', () => {
      // Remove the participant when the websocket is closed
      this.connections = this.connections.delete(clientId)
      this.#aggregator.removeNode(clientId)
      debug("client [%s] left", shortId)

      // Check if we dropped below the minimum number of participant required
      // or if we are already waiting for new participants to join
      if (this.connections.size >= minNbOfParticipants ||
        this.waitingForMoreParticipants
      ) return

      // tell remaining participants to wait until more participants join
      this.sendWaitForMoreParticipantsMsg()
    })
  }
}