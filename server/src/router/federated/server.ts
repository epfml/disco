import createDebug from "debug";
import WebSocket from 'ws'
import { v4 as randomUUID } from 'uuid'
import { List, Map } from 'immutable'
import msgpack from 'msgpack-lite'

import type {
  Task,
  TaskID,
  WeightsContainer,
} from '@epfml/discojs'
import {
  aggregator as aggregators,
  client,
  serialization,
} from '@epfml/discojs'

import { Server } from '../server.js'

import messages = client.federated.messages
import AssignNodeID = client.messages.AssignNodeID

import MessageTypes = client.messages.type

const debug = createDebug("server:router:federated")

/**
 * Represents a log entry for a given request. Consists of:
 * - the request type corresponding to the exchanged message
 * - the node id who made the request
 * - the task id for which the request was made
 * - the round for which the request was made
 * - the timestamp at which the request was made
 */
interface Log {
  timestamp: Date
  task: TaskID
  round: number
  nodeId: client.NodeID
  type: MessageTypes
}

export class Federated extends Server {
  /**
   * Aggregators for each hosted task.
   */
  private aggregators = Map<TaskID, aggregators.Aggregator>()
  /**
   * Promises containing the current round's results. To be awaited on when providing clients
   * with the most recent result.
   */
  private results = Map<TaskID, Promise<WeightsContainer>>()
  
  // TODO use real log system
  /**
  * Logs of successful requests made to the server.
  */
  private logs = List<Log>()

  private rounds = Map<TaskID, number>()

  protected readonly description = 'Disco Federated Server'

  protected buildRoute (task: TaskID): string {
    return `/${task}`
  }

  public isValidUrl (url: string | undefined): boolean {
    const splittedUrl = url?.split('/')

    return (
      splittedUrl !== undefined &&
      splittedUrl.length === 3 &&
      splittedUrl[0] === '' &&
      this.isValidTask(splittedUrl[1]) &&
      this.isValidWebSocket(splittedUrl[2])
    )
  }

  /**
   * Loop creating an aggregation result promise at each round.
   * Because clients contribute to the round asynchronously, a promise is used to let them wait
   * until the server has aggregated the weights. This loop creates a promise whenever the previous
   * one resolved and awaits until it resolves. The promise is used in createPromiseForWeights.
   * @param aggregator The aggregation handler
   */
  private async storeAggregationResult (task: TaskID, aggregator: aggregators.Aggregator): Promise<void> {
    // Create a promise on the future aggregated weights
    const result = new Promise<WeightsContainer>((resolve) => aggregator.once('aggregation', resolve))
    // Store the promise such that it is accessible from other methods
    this.results = this.results.set(task, result)
    // The promise resolves once the server received enough contributions (through the handle method)
    // and the aggregator aggregated the weights.
    await result
    // Update the server round with the aggregator round
    this.rounds = this.rounds.set(task, aggregator.round)
    // Create a new promise for the next round
    // TODO weird usage, should be handled inside of aggregator
    void this.storeAggregationResult(task, aggregator)
  }

  protected initTask(task: TaskID): void {
    // The server waits for 100% of the nodes to send their contributions before aggregating the updates
    const aggregator = new aggregators.MeanAggregator(undefined, 1, 'relative')

    this.aggregators = this.aggregators.set(task, aggregator)
    this.rounds = this.rounds.set(task, 0)

    void this.storeAggregationResult(task, aggregator)
  }

  /**
   * This method is called after received a local update.
   * It puts the client on hold until the server has aggregated the weights
   * by creating a Promise which will resolve once the server has received
   * enough contributions. Relying on a promise is useful since clients may
   * send their contributions at different times and a promise lets the server
   * wait asynchronously for the results
   *
   * @param task the task to which the client is contributing
   * @param aggregator the server aggregator, in order to access the current round
   * @param ws the websocket through which send the aggregated weights
   */
  private createPromiseForWeights (
    task: TaskID,
    aggregator: aggregators.Aggregator,
    ws: WebSocket): void {
    const promisedResult = this.results.get(task)
    if (promisedResult === undefined) {
      throw new Error(`result promise was not set for task ${task}`)
    }

    // Wait for aggregation result to resolve with timeout, giving the network a time window
    // to contribute to the model
    void Promise.race([promisedResult, client.timeout()]) //TODO: it doesn't make sense that the server is using the client utils' timeout 
      .then((result) =>
      // Reply with round - 1 because the round number should match the round at which the client sent its weights
      // After the server aggregated the weights it also incremented the round so the server replies with round - 1
        [result, aggregator.round - 1] as [WeightsContainer, number])
      .then(async ([result, round]) =>
        [await serialization.weights.encode(result), round] as [serialization.weights.Encoded, number])
      .then(([serialized, round]) => {
        const msg: messages.ReceiveServerPayload = {
          type: MessageTypes.ReceiveServerPayload,
          round,
          payload: serialized,
          nbOfParticipants: aggregator.nodes.size
        }
        ws.send(msgpack.encode(msg))
      })
      .catch((e) => debug("while waiting for weights: %o", e))
  }

  protected handle (task: Task, ws: WebSocket): void {
    const aggregator = this.aggregators.get(task.id)
    if (aggregator === undefined)
      throw new Error(`no aggregator for task ${task.id}`)

    // Client id of the message sender
    let clientId = randomUUID()
    while (!aggregator.registerNode(clientId)) {
      clientId = randomUUID()
    }

    ws.on('message', (data: Buffer) => {
      const msg: unknown = msgpack.decode(data)
      if (!client.federated.messages.isMessageFederated(msg)) {
        debug("invalid federated message received on WebSocket: %o", msg);
        return // TODO send back error
      }

      if (msg.type === MessageTypes.ClientConnected) {
        this.logsAppend(task.id, clientId, MessageTypes.ClientConnected, 0)
        debug(`client ${clientId} joined ${task.id}`)

        const msg: AssignNodeID = {
          type: MessageTypes.AssignNodeID,
          id: clientId
        }
        ws.send(msgpack.encode(msg))
      } else if (msg.type === MessageTypes.SendPayload) {
        this.logsAppend(task.id, clientId, MessageTypes.SendPayload, msg.round)

        const { payload, round } = msg
        const weights = serialization.weights.decode(payload)

        this.createPromiseForWeights(task.id, aggregator, ws)

        // TODO support multiple communication round
        if (!aggregator.add(clientId, weights, round, 0)) {
          debug(`dropped contribution from client ${clientId} for round ${round}`);
          return // TODO what to answer?
        }
      }
    })
  }

  /**
   * Appends a request to the logs.
   * @param task The task id for which the request was made
   * @param nodeId The node id who made the request
   * @param type The request type
   * @param round The round for which the request was made
   */
  private logsAppend (
    task: TaskID,
    nodeId: client.NodeID,
    type: MessageTypes,
    round: number | undefined = undefined
  ): void {
    if (round === undefined) {
      return
    }

    this.logs = this.logs.push({
      timestamp: new Date(),
      task,
      round,
      nodeId,
      type
    })
  }
}
