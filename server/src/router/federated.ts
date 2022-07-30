import express, { Request, Response } from 'express'
import { List, Map, Set } from 'immutable'
import msgpack from 'msgpack-lite'

import { tf, serialization, aggregation, AsyncInformant, Task, isTaskID, TaskID, AsyncBuffer, Weights } from 'discojs'

import { Config } from '../config'
import { TasksAndModels } from '../tasks'

const BUFFER_CAPACITY = 2

enum RequestType {
  Connect,
  Disconnect,

  SelectionStatus,
  AggregationStatus,

  GetWeights,
  PostWeights,
  PostAsyncWeights,

  GetMetadata,
  PostMetadata,

  GetAsyncRound,
  GetTasks,
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

export class Federated {
  // model weights received from clients for a given task and round.
  private asyncBuffersMap = Map<TaskID, AsyncBuffer<Weights>>()
  // informants for each task.
  private asyncInformantsMap = Map<string, AsyncInformant<Weights>>()
  /**
   * Contains metadata used for training by clients for a given task and round.
   * Stored by task ID, round number and client ID.
   */
  private metadataMap = Map<TaskID, Map<number, Map<string, Map<string, string>>>>()

  // Contains all successful requests made to the server.
  // TODO use real log system
  private logs = List<Log>()

  // Contains client IDs currently connected to one of the server.
  private clients = Set<string>()

  private models= Map<TaskID, tf.LayersModel>()

  /**
   * Maps a task to a status object. Currently provides the round number and
   * round status for each task.
   */
  private tasksStatus = Map<TaskID, TaskStatus>()

  private readonly ownRouter: express.Router

  constructor (
    private readonly config: Config,
    tasksAndModels: TasksAndModels
  ) {
    this.ownRouter = express.Router()

    this.ownRouter.get('/', (_, res) => res.send('FeAI server\n'))

    this.ownRouter.get('/connect/:task/:id', (req, res) => this.connect(req, res))
    this.ownRouter.get('/disconnect/:task/:id', (req, res) => this.disconnect(req, res))

    this.ownRouter
      .route('/weights/:task/:id')
      .get(async (req, res) => await this.getWeightsHandler(req, res))
      .post(async (req, res) => await this.postWeights(req, res))

    this.ownRouter.get('/round/:task/:id', (req, res, next) => {
      this.getRound(req, res).catch(next)
    })

    this.ownRouter.get('/statistics/:task/:id', (req, res, next) => {
      this.getAsyncWeightInformantStatistics(req, res).catch(next)
    })

    this.ownRouter
      .route('/metadata/:metadata/:task/:round/:id')
      .get((req, res) => this.getMetadataMap(req, res))
      .post((req, res) => this.postMetadata(req, res))

    this.ownRouter.get('/logs', (req, res) => this.queryLogs(req, res))

    // delay listener
    process.nextTick(() =>
      tasksAndModels.addListener('taskAndModel', (t, m) => {
        this.onNewTask(t, m).catch(console.error)
      }))
  }

  public get router (): express.Router {
    return this.ownRouter
  }

  private async onNewTask (task: Task, model: tf.LayersModel): Promise<void> {
    this.tasksStatus = this.tasksStatus.set(
      task.taskID,
      { isRoundPending: false, round: 0 }
    )

    const buffer = new AsyncBuffer(
      task.taskID,
      BUFFER_CAPACITY,
      async (weights: Weights[]) => await this.aggregateAndStoreWeights(model, weights)
    )
    this.asyncBuffersMap = this.asyncBuffersMap.set(task.taskID, buffer)

    this.asyncInformantsMap = this.asyncInformantsMap.set(
      task.taskID,
      new AsyncInformant(buffer)
    )

    this.models = this.models.set(task.taskID, model)
  }

  /**
   * Verifies that the given POST request is correctly formatted. Its body must
   * contain:
   * - the client's ID
   * - a timestamp corresponding to the time at which the request was made
   * The client must already be connected to the specified task before making any
   * subsequent POST requests related to training.
   * @param {Request} request received from client
   */
  // TODO use https://expressjs.com/en/guide/error-handling.html
  private checkRequest (request: Request): number {
    const round = Number.parseInt(request.params.round)

    if (Number.isNaN(round)) {
      return 400
    }

    return this.checkIfHasValidTaskAndId(request)
  }

  private checkIfHasValidTaskAndId (request: Request): number {
    const task = request.params.task
    const id = request.params.id

    if (!(this.tasksStatus.has(task))) {
      return 404
    }
    if (!this.clients.contains(id)) {
      return 401
    }

    return 200
  }

  private failRequest (response: Response, type: RequestType, code: number): number {
    console.error(`${type} failed with code ${code}`)
    response.status(code).send()
    return code
  }

  /**
   * Appends the given request to the server logs.
   * @param {Request} request received from client
   * @param {String} type of the request
   */
  private logsAppend (request: Request, type: RequestType): void {
    const round = parseRound(request.params.round)
    if (round === undefined) {
      return
    }

    this.logs = this.logs.push({
      timestamp: new Date(),
      task: request.params.task,
      round,
      client: request.params.id,
      request: type
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
  private async aggregateAndStoreWeights (model: tf.LayersModel, weights: Weights[]): Promise<void> {
  // Get averaged weights
    const averagedWeights = aggregation.averageWeights(List(weights))

    // Update model
    model.setWeights(averagedWeights)
  }

  /**
   * Request handler called when a client sends a GET request asking for the
   * activity history of the server (i.e. the logs). The client is allowed to be
   * more specific by providing a client ID, task ID or round number. Each
   * parameter is optional. It requires no prior connection to the server and is thus
   * publicly available data.
   */
  private queryLogs (request: Request, response: Response): void {
    const task = request.query.task
    const rawRound = request.query.round
    const id = request.query.id

    if (
      (task !== undefined && !isTaskID(task)) ||
    (rawRound !== undefined && typeof rawRound === 'string') ||
    (id !== undefined && typeof id !== 'string')
    ) {
      response.status(400)
      return
    }

    let round: number | undefined
    if (rawRound !== undefined) {
      round = parseRound(rawRound)
      if (typeof round !== 'number') {
        response.status(400)
        return
      }
    }

    const undef = '[undefined]'
    console.log('Logs query: task:', task ?? undef, 'round:', round ?? undef, 'id:', id ?? undef)

    response
      .status(200)
      .send(this.logs
        .filter((entry) => (id !== undefined ? entry.client === id : true))
        .filter((entry) => (task !== undefined ? entry.task === task : true))
        .filter((entry) => (round !== undefined ? entry.round === round : true)))
  }

  /**
   * Entry point to the server's API. Any client must go through this connection
   * process before making any subsequent POST requests to the server related to
   * the training of a task or metadata.
   * @param {Request} request received from client
   * @param {Response} response sent to client
   */
  private connect (request: Request, response: Response): void {
    const type = RequestType.Connect

    const task = request.params.task
    const id = request.params.id

    if (!this.tasksStatus.has(task)) {
      this.failRequest(response, type, 404)
      return
    }
    if (this.clients.has(id)) {
      this.failRequest(response, type, 401)
      return
    }

    this.logsAppend(request, type)

    this.clients = this.clients.add(id)
    console.log(`Client with ID ${id} connected to the server`)
    response.status(200).send()
  }

  /**
   * Request handler called when a client sends a GET request notifying the server
   * it is disconnecting from a given task.
   *
   * TODO: Automatically disconnect idle clients, i.e. clients
   * with very poor and/or sparse contribution to training in terms of performance
   * and/or weights posting frequency.
   */
  private disconnect (request: Request, response: Response): void {
    const type = RequestType.Disconnect

    const task = request.params.task
    const id = request.params.id

    if (!(this.tasksStatus.has(task) && this.clients.has(id))) {
      this.failRequest(response, type, 404)
      return
    }

    this.logsAppend(request, type)

    this.clients = this.clients.delete(id)

    console.log(`Client with ID ${id} disconnected from the server`)
    response.status(200).send()
  }

  // Checks if the request is valid for post async weights.
  private checkPostWeights (request: Request, response: Response): number {
    const type = RequestType.PostAsyncWeights

    const code = this.checkIfHasValidTaskAndId(request)
    if (code !== 200) {
      return this.failRequest(response, type, code)
    }

    if (
      request.body === undefined ||
    request.body.round === undefined ||
    request.body.weights === undefined
    ) {
      return this.failRequest(response, type, 400)
    }

    return 200
  }

  private async getWeightsHandler (request: Request, response: Response): Promise<void> {
    const task = request.params.task
    const model = this.models.get(task)
    if (model === undefined) {
      throw new Error('unknown task')
    }

    const weights = await Promise.all(model.weights.map((e) => e.read()))
    const serializedWeights = await serialization.weights.encode(weights)

    response.status(200).send(serializedWeights)
  }

  // Post weights to the async weights holder
  private async postWeights (request: Request, response: Response): Promise<void> {
    const codeFromCheckingValidity = this.checkPostWeights(request, response)
    if (codeFromCheckingValidity !== 200) {
    // request already failed
      return
    }

    const rawWeights: unknown = request.body.weights
    if (!(Array.isArray(rawWeights) && rawWeights.every((e) => typeof e === 'number'))) {
      throw new Error('invalid weights format')
    }
    const weights = serialization.weights.decode(rawWeights)

    const task = request.params.task
    const id = request.params.id
    const round = request.body.round

    const buffer = this.asyncBuffersMap.get(task)
    if (buffer === undefined) {
      throw new Error(`post weight to unknown task: ${task}`)
    }

    const codeFromAddingWeight = (await buffer.add(id, weights, round)) ? 200 : 202
    response.status(codeFromAddingWeight).send()
  }

  // Get the current round of the async weights holder
  private async getRound (request: Request, response: Response): Promise<void> {
  // Check for errors
    const type = RequestType.GetAsyncRound
    const code = this.checkIfHasValidTaskAndId(request)
    if (code !== 200) {
      this.failRequest(response, type, code)
      return
    }

    const task = request.params.task

    const buffer = this.asyncBuffersMap.get(task)
    if (buffer === undefined) {
      throw new Error(`get round of unknown task: ${task}`)
    }

    // Get latest round
    const round = buffer.round

    // Send back latest round
    response.status(200).send({ round: round })
  }

  // Get the JSON containing statistics about the async weight buffer
  private async getAsyncWeightInformantStatistics (request: Request, response: Response): Promise<void> {
  // Check for errors
    const type = RequestType.GetAsyncRound
    const code = this.checkIfHasValidTaskAndId(request)
    if (code !== 200) {
      this.failRequest(response, type, code)
      return
    }

    const task = request.params.task
    // We can use the id of requester to compute weights distance serverside
    // const id = request.params.id

    // Get latest round
    const statistics = this.asyncInformantsMap.get(task)?.getAllStatistics()

    // Send back latest round
    response.status(200).send({ statistics: statistics })
  }

  /**
   * Request handler called when a client sends a POST request containing their
   * number of data samples to the server while training a task's model. The
   * request is made for a given task and round. The request's body must contain:
   * - the client's ID
   * - a timestamp corresponding to the time at which the request was made
   * - the client's number of data samples
   * @param {Request} request received from client
   * @param {Response} response sent to client
   */
  private postMetadata (request: Request, response: Response): void {
    const type = RequestType.PostMetadata

    const code = this.checkRequest(request)
    if (code !== 200) {
      this.failRequest(response, type, code)
      return
    }

    this.logsAppend(request, type)

    const metadata = request.params.metadata
    const task = request.params.task
    const round = request.params.round
    const id = request.params.id

    if (request.body === undefined || request.body[metadata] === undefined) {
      this.failRequest(response, type, 400)
      return
    }

    if (this.metadataMap.hasIn([task, round, id, metadata])) {
      throw new Error('metadata already set')
    }
    this.metadataMap = this.metadataMap.setIn([task, round, id, metadata], request.body[metadata])

    response.status(200).send()
  }

  /**
   * Request handler called when a client sends a POST request asking the server
   * for the number of data samples held per client for a given task and round.
   * If there is no entry for the given round, sends the most recent entry for
   * each client involved in the task. The request's body must contain:
   * - the client's ID
   * - a timestamp corresponding to the time at which the request was made
   * @param {Request} request received from client
   * @param {Response} response sent to client
   */
  private getMetadataMap (request: Request, response: Response): void {
    const type = RequestType.GetMetadata

    const code = this.checkRequest(request)
    if (code !== 200) {
      this.failRequest(response, type, code)
      return
    }

    const metadata = request.params.metadata
    const task = request.params.task
    const round = Number.parseInt(request.params.round, 0)
    if (Number.isNaN(round)) {
      this.failRequest(response, type, 400)
      return
    }

    // How did this work before?
    const taskMetadata = this.metadataMap.get(task)

    if (!(taskMetadata !== undefined && round >= 0)) {
      this.failRequest(response, type, 404)
      return
    }

    this.logsAppend(request, type)

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
        .filter((entries) => entries.has(metadata))
        .mapEntries(([id, entries]) => [id, entries.get(metadata)]))

    response.status(200).send({
      metadata: msgpack.encode(Array.from(queriedMetadataMap))
    })
  }
}

function parseRound (raw: unknown): number | undefined {
  if (typeof raw !== 'string') {
    return undefined
  }

  const round = Number.parseInt(raw)
  if (Number.isNaN(round)) {
    return undefined
  }

  return round
}
