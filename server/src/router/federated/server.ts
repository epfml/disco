import express from 'express'
import WebSocket from 'ws'
import { v4 as randomUUID } from 'uuid'

import { List, Map } from 'immutable'
import msgpack from 'msgpack-lite'

import {
  client,
  tf,
  serialization,
  AsyncInformant,
  Task,
  TaskID,
  aggregator as aggregators,
  WeightsContainer,
  MetadataKey,
  MetadataValue
} from '@epfml/discojs-node'

import { Server } from '../server'

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

  protected get description (): string {
    return 'Disco Federated Server'
  }

  protected buildRoute (task: Task): string {
    return `/${task.taskID}`
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
   * Loop storing aggregation results, every time an aggregation result promise resolves.
   * This happens once per round.
   * @param aggregator The aggregation handler
   */
  private async storeAggregationResult (aggregator: aggregators.Aggregator): Promise<void> {
    // Renew the aggregation result promise.
    const result = aggregator.receiveResult()
    // Store the result promise somewhere for the server to fetch from, so that it can await
    // the result on client request.
    this.results = this.results.set(aggregator.task.taskID, result)
    // Set a minimum amount of time to wait in the current round to let clients ask for the latest weights
    // This is relevant mostly when there are few clients and rounds are almost instantaneous.
    await new Promise(resolve => setTimeout(resolve, 1000))
    await result
    void this.storeAggregationResult(aggregator)
  }

  protected initTask (task: Task, model: tf.LayersModel): void {
    const aggregator = new aggregators.MeanAggregator(task, model)

    this.aggregators = this.aggregators.set(task.taskID, aggregator)
    this.informants = this.informants.set(task.taskID, new AsyncInformant(aggregator))
    this.rounds = this.rounds.set(task.taskID, 0)

    void this.storeAggregationResult(aggregator)
  }

  protected handle (
    task: Task,
    ws: WebSocket,
    model: tf.LayersModel,
    req: express.Request
  ): void {
    const taskAggregator = this.aggregators.get(task.taskID)
    if (taskAggregator === undefined) {
      throw new Error('connecting to a non-existing task')
    }
    // Client id of the message sender
    let clientId = randomUUID()
    while (!taskAggregator.registerNode(clientId)) {
      clientId = randomUUID()
    }

    ws.on('message', (data: Buffer) => {
      const msg = msgpack.decode(data)

      if (msg.type === MessageTypes.ClientConnected) {
        let aggregator = this.aggregators.get(task.taskID)
        if (aggregator === undefined) {
          aggregator = new aggregators.MeanAggregator(task)
          this.aggregators = this.aggregators.set(task.taskID, aggregator)
        }
        console.info('client', clientId, 'joined', task.taskID)

        this.logsAppend(task.taskID, clientId, MessageTypes.ClientConnected, 0)

        const msg: AssignNodeID = {
          type: MessageTypes.AssignNodeID,
          id: clientId
        }
        ws.send(msgpack.encode(msg))
      } else if (msg.type === MessageTypes.SendPayload) {
        const { payload, round } = msg

        const aggregator = this.aggregators.get(task.taskID)

        this.logsAppend(
          task.taskID,
          clientId,
          MessageTypes.SendPayload,
          msg.round
        )

        if (!(
          Array.isArray(payload) &&
          payload.every((e) => typeof e === 'number')
        )) {
          throw new Error('received invalid weights format')
        }

        const serialized = serialization.weights.decode(payload)

        if (aggregator === undefined) {
          throw new Error(`received weights for unknown task: ${task.taskID}`)
        }

        // TODO @s314cy: add communication rounds to federated learning
        if (!aggregator.add(clientId, serialized, round, 0)) {
          console.info('Dropped contribution from client', clientId, 'for round', round)
        }
      } else if (msg.type === MessageTypes.ReceiveServerStatistics) {
        const statistics = this.informants
          .get(task.taskID)
          ?.getAllStatistics()

        const msg: messages.ReceiveServerStatistics = {
          type: MessageTypes.ReceiveServerStatistics,
          statistics: statistics ?? {}
        }

        ws.send(msgpack.encode(msg))
      } else if (msg.type === MessageTypes.ReceiveServerPayload) {
        const aggregator = this.aggregators.get(task.taskID)
        if (aggregator === undefined) {
          throw new Error(`requesting round of unknown task: ${task.taskID}`)
        }

        this.logsAppend(task.taskID, clientId, MessageTypes.ReceiveServerPayload, 0)

        if (model === undefined) {
          throw new Error('aggregator model was not set')
        }

        const promisedResult = this.results.get(task.taskID)
        if (promisedResult === undefined) {
          throw new Error(`result promise was not set for task ${task.taskID}`)
        }

        // Wait for aggregation result with timeout, giving the network a time window
        // to contribute to the model sent to the requesting client.
        void Promise.race([promisedResult, client.utils.timeout()])
          .then((result) =>
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
      } else if (msg.type === MessageTypes.SendMetadata) {
        const { round, key, value } = msg

        this.logsAppend(task.taskID, clientId, MessageTypes.SendMetadata, round)

        if (this.metadataMap.hasIn([task.taskID, round, clientId, key])) {
          throw new Error('metadata already set')
        }
        this.metadataMap = this.metadataMap.setIn(
          [task, round, clientId, key],
          value
        )
      } else if (msg.type === MessageTypes.ReceiveServerMetadata) {
        const key = msg.metadataId
        const round = Number.parseInt(msg.round, 0)

        const taskMetadata = this.metadataMap.get(task.taskID)

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

          this.logsAppend(task.taskID, clientId, MessageTypes.ReceiveServerMetadata, round)

          const msg: messages.ReceiveServerMetadata = {
            type: MessageTypes.ReceiveServerMetadata,
            taskId: task.taskID,
            nodeId: clientId,
            key,
            round: round,
            metadataMap: Array.from(queriedMetadataMap)
          }

          ws.send(msgpack.encode(msg))
        }
      }
    })
  }

  /**
   * Appends a request to the logs.
   * @param taskId The task id for which the request was made
   * @param nodeId The node id who made the request
   * @param type The request type
   * @param round The round for which the request was made
   */
  private logsAppend (
    taskId: TaskID,
    nodeId: client.NodeID,
    type: MessageTypes,
    round: number | undefined = undefined
  ): void {
    if (round === undefined) {
      return
    }

    this.logs = this.logs.push({
      timestamp: new Date(),
      task: taskId,
      round,
      nodeId,
      type
    })
  }
}
