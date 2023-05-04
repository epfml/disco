import express from 'express'
import WebSocket from 'ws'

import { List, Map, Set } from 'immutable'
import msgpack from 'msgpack-lite'

import {
  aggregation, AsyncBuffer, AsyncInformant, client, serialization, Task,
  TaskID, tf, WeightsContainer
} from '@epfml/discojs-node'

import { Server } from './server'
import messages = client.federated.messages
import messageTypes = client.messages.type
import clientConnected = client.messages.type.clientConnected

const BUFFER_CAPACITY = 3

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

export class Federated extends Server {
  // model weights received from clients for a given task and round.
  private asyncBuffersMap = Map<TaskID, AsyncBuffer<WeightsContainer>>()
  // informants for each task.
  private asyncInformantsMap = Map<string, AsyncInformant<WeightsContainer>>()
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

  private globalMomentum = Map<TaskID, WeightsContainer>()

  /**
   * Maps a task to a status object. Currently provides the round number and
   * round status for each task.
   */
  private currentTaskClientRound = Map<TaskID, Map<string, number>>()

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
    const msg: messages.messageGeneral = { type: clientConnected }
    ws.send(msgpack.encode(msg))
  }

  protected initTask (task: Task, model: tf.LayersModel): void {
    this.currentTaskClientRound = this.currentTaskClientRound.set(task.taskID, Map())

    const isByzantineRobust: boolean | undefined = task.trainingInformation?.byzantineRobustAggregator
    const tauPercentile: number | undefined = task.trainingInformation?.tauPercentile

    const buffer = new AsyncBuffer<WeightsContainer>(
      task.taskID,
      BUFFER_CAPACITY,
      async (weightsOrMomentum: Iterable<WeightsContainer>) =>
        await this.aggregateAndStore(task.taskID, model, List(weightsOrMomentum), isByzantineRobust, tauPercentile),
      0,
      (lastRound: number) => this.updateTaskStatus(task.taskID, lastRound)
    )
    this.asyncBuffersMap = this.asyncBuffersMap.set(task.taskID, buffer)

    this.asyncInformantsMap = this.asyncInformantsMap.set(
      task.taskID,
      new AsyncInformant(buffer)
    )

    this.globalMomentum = this.globalMomentum.set(task.taskID, WeightsContainer.of(...model.getWeights().map(weights => tf.zerosLike(weights))))
    this.models = this.models.set(task.taskID, model)
  }

  private updateTaskStatus (taskId: TaskID, lastRound: number): void {
    this.clients.forEach(client => {
      const currentTaskRoundMap = this.currentTaskClientRound.get(taskId)
      if (currentTaskRoundMap != null) {
        this.currentTaskClientRound = this.currentTaskClientRound.set(taskId, currentTaskRoundMap.set(client, lastRound))
      }
    })
  }

  private async waitForRound (task: Task, clientId: string): Promise<void> {
    const poll: (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void = (resolve, reject) => {
      const buffer: AsyncBuffer<WeightsContainer> | undefined = this.asyncBuffersMap.get(task.taskID)
      const clientTaskRound: number | undefined = this.currentTaskClientRound.get(task.taskID)?.get(clientId)

      if (buffer !== undefined && clientTaskRound !== undefined && clientTaskRound === buffer.round - 1) {
        const currentTaskRoundMap = this.currentTaskClientRound.get(task.taskID)
        if (currentTaskRoundMap != null) {
          this.currentTaskClientRound = this.currentTaskClientRound.set(task.taskID, currentTaskRoundMap.set(clientId, buffer.round))
        }

        resolve()
      } else if (buffer === undefined || clientTaskRound === undefined) {
        reject()
      } else {
        setTimeout(_ => poll(resolve, reject), 50)
      }
    }

    return await new Promise(poll)
  }

  protected handle (
    task: Task,
    ws: WebSocket,
    model: tf.LayersModel,
    req: express.Request
  ): void {
    const clientId = req.params.clientId

    ws.on('message', (data: Buffer) => {
      const msg = msgpack.decode(data)
      if (msg.type === clientConnected) {
        console.info('client', clientId, 'joined', task.taskID)

        this.clients = this.clients.add(clientId)

        const currentTaskRoundMap = this.currentTaskClientRound.get(task.taskID)
        if (currentTaskRoundMap != null) {
          this.currentTaskClientRound = this.currentTaskClientRound.set(task.taskID, currentTaskRoundMap.set(clientId, 0))
        }

        this.logsAppend(task.taskID, clientId, RequestType.Connect, 0)
        this.sendConnectedMsg(ws)
      } else if (msg.type === messageTypes.postToServer) {
        const rawWeights = msg.weights
        const round = msg.round
        const rawMomentum = msg.momentum

        this.logsAppend(
          task.taskID,
          clientId,
          RequestType.PostAsyncWeights,
          round
        )

        if (task.trainingInformation.byzantineRobustAggregator !== undefined && task.trainingInformation.tauPercentile !== undefined &&
          !(Array.isArray(rawMomentum) && rawMomentum.every((e) => typeof e === 'number'))) {
          throw new Error('invalid momentum format')
        }

        if (task.trainingInformation.byzantineRobustAggregator === undefined && task.trainingInformation.tauPercentile === undefined &&
          !(Array.isArray(rawWeights) && rawWeights.every((e) => typeof e === 'number'))) {
          throw new Error('invalid weights format')
        }

        const weightsOrMomentum = rawWeights !== null ? serialization.weights.decode(rawWeights) : serialization.weights.decode(rawMomentum)

        const buffer = this.asyncBuffersMap.get(task.taskID)
        if (buffer === undefined) {
          throw new Error(`post weight to unknown task: ${task.taskID}`)
        }

        void buffer.add(clientId, weightsOrMomentum, round)
      } else if (msg.type === messageTypes.pullServerStatistics) {
        void this.waitForRound(task, clientId).then(() => {
          // Get latest round
          const statistics = this.asyncInformantsMap
            .get(task.taskID)
            ?.getAllStatistics()

          const msg: messages.pullServerStatistics = {
            type: messageTypes.pullServerStatistics,
            statistics: statistics ?? {}
          }

          ws.send(msgpack.encode(msg))
        })
      } else if (msg.type === messageTypes.latestServerRound) {
        const buffer = this.asyncBuffersMap.get(task.taskID)
        if (buffer === undefined) {
          throw new Error(`get round of unknown task: ${task.taskID}`)
        }

        // Get latest round
        const round = buffer.round

        this.logsAppend(task.taskID, clientId, RequestType.GetAsyncRound, 0)

        const weights = WeightsContainer.from(model)
        void serialization.weights.encode(weights).then((serializedWeights) => {
          const msg: messages.latestServerRound = {
            type: messageTypes.latestServerRound,
            round: round,
            weights: serializedWeights
          }

          ws.send(msgpack.encode(msg))
        })
      } else if (msg.type === messageTypes.postMetadata) {
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
      } else if (msg.type === messageTypes.getMetadataMap) {
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
            type: messageTypes.getMetadataMap,
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
   * 1. create a new TF.js model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  private async aggregateAndStore (
    taskID: TaskID,
    model: tf.LayersModel,
    weightsOrMomentum: List<WeightsContainer>,
    byzantineRobustAggregator?: boolean,
    tauPercentile?: number
  ): Promise<void> {
    let averagedWeights: WeightsContainer

    if (byzantineRobustAggregator !== undefined && tauPercentile !== undefined) {
      console.log('Using Byzantine-Robust Aggregator')
      const globalMomentum = this.globalMomentum.get(taskID)
      if (globalMomentum === undefined) {
        throw new Error('Global momentum is undefined')
      }

      const averagedMomentum = aggregation.avgClippingWeights(weightsOrMomentum, globalMomentum, tauPercentile)
      this.globalMomentum = this.globalMomentum.set(taskID, averagedMomentum)

      averagedWeights = WeightsContainer.from(model).add(aggregation.avg(weightsOrMomentum))
    } else {
      console.log('Using Standard Aggregator')

      averagedWeights = aggregation.avg(weightsOrMomentum)
    }

    // console.log(averagedWeights.weights.map(w => w.arraySync()))

    // Update model
    model.setWeights(averagedWeights.weights)
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
