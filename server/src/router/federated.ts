import express from 'express'
import WebSocket from 'ws'

import { List, Map, Set } from 'immutable'
import msgpack from 'msgpack-lite'

import {
  client,
  tf,
  serialization,
  aggregation,
  AsyncInformant,
  Task,
  TaskID,
  AsyncBuffer,
  Weights
} from '@epfml/discojs'

import { Server } from './server'
import messages = client.federated.messages

const BUFFER_CAPACITY = 2

enum RequestType {
  Connect,
  Disconnect,

  PostAsyncWeights,

  GetMetadata,
  PostMetadata,

  GetAsyncRound,
}

interface Log {
  // a timestamp corresponding to the time at which the request was made
  timestamp: Date
  // the task ID for which the request was made
  task: TaskID
  // the round at which the request was made
  round: number
  // the client ID used to make the request
  client: string
  // the request type
  request: RequestType
}

interface TaskStatus {
  isRoundPending: boolean
  round: number
}

export class Federated extends Server {
  // model weights received from clients for a given task and round.
  private asyncBuffersMap = Map<TaskID, AsyncBuffer<Weights>>()
  // informants for each task.
  private asyncInformantsMap = Map<string, AsyncInformant<Weights>>()
  /**
   * Contains metadata used for training by clients for a given task and round.
   * Stored by task ID, round number and client ID.
   */
  private metadataMap = Map<
  TaskID,
  Map<number, Map<string, Map<string, string>>>
  >()

  // Contains all successful requests made to the server.
  // TODO use real log system
  private logs = List<Log>()

  // Contains client IDs currently connected to one of the server.
  private clients = Set<string>()

  private models = Map<TaskID, tf.LayersModel>()

  /**
   * Maps a task to a status object. Currently provides the round number and
   * round status for each task.
   */
  private tasksStatus = Map<TaskID, TaskStatus>()

  protected get description (): string {
    return 'FeAI Server'
  }

  protected buildRoute (task: Task): string {
    return `/${task.taskID}/:clientId`
  }

  public isValidUrl (url: string | undefined): boolean {
    const splittedUrl = url?.split('/')

    return (splittedUrl !== undefined && splittedUrl.length === 4 && splittedUrl[0] === '' &&
      this.isValidTask(splittedUrl[1]) && this.isValidClientId(splittedUrl[2]) &&
      this.isValidWebSocket(splittedUrl[3]))
  }

  protected sendConnectedMsg (ws: WebSocket): void {
    const msg: messages.messageGeneral = { type: messages.messageType.clientConnected }
    ws.send(msgpack.encode(msg))
  }

  protected initTask (task: Task, model: tf.LayersModel): void {
    this.tasksStatus = this.tasksStatus.set(task.taskID, {
      isRoundPending: false,
      round: 0
    })

    const buffer = new AsyncBuffer(
      task.taskID,
      BUFFER_CAPACITY,
      async (weights: Weights[]) =>
        await this.aggregateAndStoreWeights(model, weights)
    )
    this.asyncBuffersMap = this.asyncBuffersMap.set(task.taskID, buffer)

    this.asyncInformantsMap = this.asyncInformantsMap.set(
      task.taskID,
      new AsyncInformant(buffer)
    )

    this.models = this.models.set(task.taskID, model)
  }

  protected handle (
    task: Task,
    ws: WebSocket,
    model: tf.LayersModel,
    req: express.Request
  ): void {
    const clientId = req.params.clientId
    console.info('client', clientId, 'joined', task.taskID)

    this.clients = this.clients.add(clientId)

    this.logsAppend(task.taskID, clientId, RequestType.Connect, 0)

    ws.on('message', (data: Buffer) => {
      const msg = msgpack.decode(data)

      if (msg.type === messages.messageType.postWeightsToServer) {
        const rawWeights = msg.weights
        const round = msg.round

        this.logsAppend(
          task.taskID,
          clientId,
          RequestType.PostAsyncWeights,
          round
        )

        if (
          !(
            Array.isArray(rawWeights) &&
            rawWeights.every((e) => typeof e === 'number')
          )
        ) {
          throw new Error('invalid weights format')
        }

        const weights = serialization.weights.decode(rawWeights)

        const buffer = this.asyncBuffersMap.get(task.taskID)
        if (buffer === undefined) {
          throw new Error(`post weight to unknown task: ${task.taskID}`)
        }

        void buffer.add(clientId, weights, round)
      } else if (msg.type === messages.messageType.pullServerStatistics) {
        // Get latest round
        const statistics = this.asyncInformantsMap
          .get(task.taskID)
          ?.getAllStatistics()

        const msg: messages.pullServerStatistics = {
          type: messages.messageType.pullServerStatistics,
          statistics: statistics ?? {}
        }

        ws.send(msgpack.encode(msg))
      } else if (msg.type === messages.messageType.latestServerRound) {
        const buffer = this.asyncBuffersMap.get(task.taskID)
        if (buffer === undefined) {
          throw new Error(`get round of unknown task: ${task.taskID}`)
        }

        // Get latest round
        const round = buffer.round

        this.logsAppend(task.taskID, clientId, RequestType.GetAsyncRound, 0)

        const weights = model.weights.map((e) => e.read())
        void serialization.weights.encode(weights).then((serializedWeights) => {
          const msg: messages.latestServerRound = {
            type: messages.messageType.latestServerRound,
            round: round,
            weights: serializedWeights
          }

          ws.send(msgpack.encode(msg))
        })
      } else if (msg.type === messages.messageType.postMetadata) {
        const round = msg.round

        const metadataId = msg.metadataId
        const metadata = msg.metadata

        this.logsAppend(task.taskID, clientId, RequestType.PostMetadata, round)

        if (
          this.metadataMap.hasIn([task.taskID, round, clientId, metadataId])
        ) {
          throw new Error('metadata already set')
        }
        this.metadataMap = this.metadataMap.setIn(
          [task, round, clientId, metadataId],
          metadata
        )
      } else if (msg.type === messages.messageType.getMetadataMap) {
        const metadataId = msg.metadataId
        const round = Number.parseInt(msg.round, 0)

        const taskMetadata = this.metadataMap.get(task.taskID)

        if (!Number.isNaN(round) && round >= 0 && taskMetadata !== undefined) {
          /**
           * Find the most recent entry round-wise for the given task (upper bounded
           * by the given round). Allows for sporadic entries in the metadata map.
           */
          const latestRound = taskMetadata.keySeq().max() ?? round

          /**
           * Fetch the required metadata from the general metadata structure stored
           * server-side and construct the queried metadata's map accordingly. This
           * essentially creates a "ID -> metadata" single-layer map.
           */
          const queriedMetadataMap = Map(
            taskMetadata
              .get(latestRound, Map<string, Map<string, string>>())
              .filter((entries) => entries.has(metadataId))
              .mapEntries(([id, entries]) => [id, entries.get(metadataId)])
          )

          this.logsAppend(task.taskID, clientId, RequestType.GetMetadata, round)

          const msg: messages.getMetadataMap = {
            type: messages.messageType.getMetadataMap,
            clientId: clientId,
            taskId: task.taskID,
            metadataId: metadataId,
            round: round,
            metadataMap: Array.from(queriedMetadataMap)
          }

          ws.send(msgpack.encode(msg))
        }
      }
    })
  }

  /**
   * Save the newly aggregated model to the server's local storage. This
   * is now the model served to clients for the given task. To save the newly
   * aggregated weights, here is the (cumbersome) procedure:
   * 1. create a new TFJS model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  private async aggregateAndStoreWeights (
    model: tf.LayersModel,
    weights: Weights[]
  ): Promise<void> {
    // Get averaged weights
    const averagedWeights = aggregation.averageWeights(List(weights))

    // Update model
    model.setWeights(averagedWeights)
  }

  /**
   * Appends the given request to the server logs.
   * @param {Request} request received from client
   * @param {String} type of the request
   */
  private logsAppend (
    taskId: TaskID,
    clientId: string,
    type: RequestType,
    round: number | undefined = undefined
  ): void {
    if (round === undefined) {
      return
    }

    this.logs = this.logs.push({
      timestamp: new Date(),
      task: taskId,
      round,
      client: clientId,
      request: type
    })
  }
}
