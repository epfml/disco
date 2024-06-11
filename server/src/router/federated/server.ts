import WebSocket from 'ws'
import { v4 as randomUUID } from 'uuid'
import { List, Map } from 'immutable'
import msgpack from 'msgpack-lite'

import type {
  Model,
  Task,
  TaskID,
  WeightsContainer,
  MetadataKey,
  MetadataValue
} from '@epfml/discojs'
import {
  client,
  serialization,
  AsyncInformant,
  aggregator as aggregators,
} from '@epfml/discojs'

import { Server } from '../server.js'

import messages = client.federated.messages
import AssignNodeID = client.messages.AssignNodeID

import MessageTypes = client.messages.type

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
  /**
   * Training informants for each hosted task.
   */
  private informants = Map<TaskID, AsyncInformant<WeightsContainer>>()
  /**
   * Contains metadata used for training by clients for a given task and round.
   * Stored by task id, round number, node id and metadata key.
  */
  private metadataMap = Map<TaskID, Map<number, Map<client.NodeID, Map<MetadataKey, MetadataValue>>>>()
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
    const result = aggregator.receiveResult()
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

  protected initTask (task: TaskID, model: Model): void {
    const aggregator = new aggregators.MeanAggregator(model)

    this.aggregators = this.aggregators.set(task, aggregator)
    this.informants = this.informants.set(task, new AsyncInformant(aggregator))
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
    void Promise.race([promisedResult, client.utils.timeout()])
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
          payload: serialized
        }
        ws.send(msgpack.encode(msg))
      })
      .catch(console.error)
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
        console.error('invalid federated message received on WebSocket')
        return // TODO send back error
      }

      if (msg.type === MessageTypes.ClientConnected) {
        this.logsAppend(task.id, clientId, MessageTypes.ClientConnected, 0)
        console.info('client', clientId, 'joined', task.id)

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
          console.info(`dropped contribution from client ${clientId} for round ${round}`)
          return // TODO what to answer?
	}
      } else if (msg.type === MessageTypes.ReceiveServerMetadata) {
        const { key, round } = msg

        const taskMetadata = this.metadataMap.get(task.id)

        if (!Number.isNaN(round) && round >= 0 && taskMetadata !== undefined) {
          // Find the most recent entry round-wise for the given task (upper bounded
          // by the given round). Allows for sporadic entries in the metadata map.
          const latestRound = taskMetadata.keySeq().max() ?? round

          // Fetch the required metadata from the general metadata structure stored
          // server-side and construct the queried metadata's map accordingly. This
          // essentially creates a "ID -> metadata" single-layer map.
          const queriedMetadataMap = Map(
            taskMetadata
              .get(latestRound, Map<string, Map<string, string>>())
              .filter((entries) => entries.has(key))
              .mapEntries(([id, entries]) => [id, entries.get(key)])
          )

          this.logsAppend(task.id, clientId, MessageTypes.ReceiveServerMetadata, round)

          const msg: messages.ReceiveServerMetadata = {
            type: MessageTypes.ReceiveServerMetadata,
            taskId: task.id,
            nodeId: clientId,
            key,
            round,
            metadataMap: Array.from(queriedMetadataMap)
          }

          ws.send(msgpack.encode(msg))
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
