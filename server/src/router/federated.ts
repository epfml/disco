import { Request, Response } from 'express'
import fs from 'fs'
import immutable from 'immutable'
import msgpack from 'msgpack-lite'
import path from 'path'
import * as tf from '@tensorflow/tfjs-node'

import { serialization, aggregation, AsyncInformant, TaskID, isTaskID, AsyncBuffer, Weights } from 'discojs'

import { CONFIG } from '../config'
import { getTasks } from '../tasks/tasks_io'

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

/**
 * Contains the model weights received from clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const asyncBuffersMap: Map<TaskID, AsyncBuffer<Weights>> = new Map()
const BUFFER_CAPACITY = 2//TODO: NACHO
/**
 * Contains the informants for each task.
 */
const asyncInformantsMap: Map<string, AsyncInformant<Weights>> = new Map()
/**
 * Contains metadata used for training by clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const metadataMap = immutable.Map<TaskID, immutable.Map<number, immutable.Map<string, immutable.Map<string, string>>>>()

/**
 * Contains all successful requests made to the server. An entry consists of:
 * - a timestamp corresponding to the time at which the request was made
 * - the client ID used to make the request
 * - the task ID for which the request was made
 * - the round at which the request was made
 * - the request type
 */
// TODO use real log system
interface Log {
  timestamp: Date
  task: TaskID
  round: number
  client: string
  request: RequestType
}
const logs: Log[] = []
/**
 * Contains client IDs currently connected to one of the server.
 * Disconnected clients should always be removed from this set
 */
const clients = new Set()
/**
 * Maps a task to a status object. Currently provides the round number and
 * round status for each task.
 */
const tasksStatus = new Map()
/**
 * Initialize the data structures declared above.
 */
getTasks(CONFIG.tasksFile).then((tasks) => tasks.forEach((task) => {
  tasksStatus.set(task.taskID, { isRoundPending: false, round: 0 })
  getOrInitAsyncWeightsBuffer(task.taskID)
})).catch(console.log)

// Inits the AsyncWeightsBuffer for the task if it does not yet exist.
// TODO return both buffer and informant
function getOrInitAsyncWeightsBuffer (taskID: TaskID): AsyncBuffer<Weights> {
  let buffer = asyncBuffersMap.get(taskID)
  if (buffer === undefined) {
    buffer = new AsyncBuffer(
      taskID,
      BUFFER_CAPACITY,
      async (weights: Weights[]) => await _aggregateAndStoreWeights(weights, taskID)
    )

    asyncInformantsMap.set(taskID, new AsyncInformant(buffer))
  }

  asyncBuffersMap.set(taskID, buffer)

  return buffer
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
function _checkRequest (request: Request): number {
  const task = request.params.task
  const round = Number.parseInt(request.params.round)
  const id = request.params.id

  if (Number.isNaN(round)) {
    return 400
  }
  if (!(tasksStatus.has(task) && round <= tasksStatus.get(task).round)) {
    return 404
  }
  if (!clients.has(id)) {
    return 401
  }
  return 200
}

function _checkIfHasValidTaskAndId (request: Request): number {
  const task = request.params.task
  const id = request.params.id

  if (!(tasksStatus.has(task))) {
    return 404
  }
  if (!clients.has(id)) {
    return 401
  }

  return 200
}

function _failRequest (response: Response, type: RequestType, code: number): number {
  console.log(`${type} failed with code ${code}`)
  response.status(code).send()
  return code
}

/**
 * Appends the given request to the server logs.
 * @param {Request} request received from client
 * @param {String} type of the request
 */
function _logsAppend (request: Request, type: RequestType): void {
  const round = parseRound(request.params.round)
  if (round === undefined) {
    return
  }

  logs.push({
    timestamp: new Date(),
    task: request.params.task,
    round,
    client: request.params.id,
    request: type
  })
}

async function writeWeights (taskID: TaskID, weights: Weights): Promise<void> {
  console.log('writing weights >>')

  fs.writeFileSync(
    path.join(CONFIG.modelDir(taskID), 'new_weights'),
    msgpack.encode(await serialization.serializeWeights(weights)))
  console.log('writing weights <<')
}

async function _aggregateAndStoreWeights (weights: Weights[], taskID: TaskID): Promise<void> {
  // TODO: check whether this actually works
  const averaged = aggregation.averageWeights(immutable.Set(weights))

  /**
   * Save the newly aggregated model to the server's local storage. This
   * is now the model served to clients for the given task. To save the newly
   * aggregated weights, here is the (cumbersome) procedure:
   * 1. create a new TFJS model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  const modelFilesPath = CONFIG.savingScheme.concat(
    path.join(CONFIG.modelDir(taskID))
  )

  const model = await tf.loadLayersModel(modelFilesPath)
  await writeWeights(taskID, model.getWeights())

  model.setWeights(model.getWeights())
  await model.save(path.dirname(modelFilesPath))
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

/**
 * Request handler called when a client sends a GET request asking for the
 * activity history of the server (i.e. the logs). The client is allowed to be
 * more specific by providing a client ID, task ID or round number. Each
 * parameter is optional. It requires no prior connection to the server and is thus
 * publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function queryLogs (request: Request, response: Response): void {
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
    .send(logs
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
export function connect (request: Request, response: Response): void {
  const type = RequestType.Connect

  const task = request.params.task
  const id = request.params.id

  if (!tasksStatus.has(task)) {
    _failRequest(response, type, 404)
    return
  }
  if (clients.has(id)) {
    _failRequest(response, type, 401)
    return
  }

  _logsAppend(request, type)

  clients.add(id)
  console.log(`Client with ID ${id} connected to the server`)
  response.status(200).send()
}

/**
 * Request handler called when a client sends a GET request notifying the server
 * it is disconnecting from a given task.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 *
 * Further improvement: Automatically disconnect idle clients, i.e. clients
 * with very poor and/or sparse contribution to training in terms of performance
 * and/or weights posting frequency.
 */
export function disconnect (request: Request, response: Response): void {
  const type = RequestType.Disconnect

  const task = request.params.task
  const id = request.params.id

  if (!(tasksStatus.has(task) && clients.has(id))) {
    _failRequest(response, type, 404)
    return
  }

  _logsAppend(request, type)

  clients.delete(id)

  console.log(`Client with ID ${id} disconnected from the server`)
  response.status(200).send()
}

/**
 * Checks if the request is valid for post async weights.
 * @param request
 * @param response
 * @returns
 */
function _checkPostWeights (request: Request, response: Response): number {
  const type = RequestType.PostAsyncWeights

  const code = _checkIfHasValidTaskAndId(request)
  if (code !== 200) {
    return _failRequest(response, type, code)
  }

  if (
    request.body === undefined ||
    request.body.round === undefined ||
    request.body.weights === undefined
  ) {
    return _failRequest(response, type, 400)
  }

  return 200
}

export async function getWeightsHandler (request: Request, response: Response): Promise<void> {
  console.log('balance')

  // Check for errors
  const task = request.params.task

  const modelFilesPath = CONFIG.savingScheme.concat(
    path.join(CONFIG.modelDir(task), 'model.json')
  )
  const model = await tf.loadLayersModel(modelFilesPath)

  console.log('model loaded')

  // Send back latest round

  response.status(200).send(await serialization.serializeWeights(await Promise.all(model.weights.map((e) => e.read()))))
}

function getWeights (request: Request): Weights {
  const obj: unknown = request.body.weights
  console.log('getWeights:', {obj})

  if (!Array.isArray(obj)) {
    throw new Error('weights is not an array')
  }
  const withArrays = obj.map((e) => {
    if (typeof e === 'object') {
        return Float32Array.from(Object.values(e))
     }
     return e
  })

  /*
  if (!obj.every((w) => typeof w === 'number')) {
    throw new Error('a weight is not a number')
  }
  */

  return withArrays.map((e) => tf.tensor(e))
}

/**
 * Post weights to the async weights holder, returns true in response if successful, and false otherwise.
 * It is successful if task and user id exist + weight corresponds to a recent round (see AsyncWeightHolder class for more info on this).
 * @param request
 * @param response
 * @returns
 */
export async function postWeights (request: Request, response: Response): Promise<void> {
  const codeFromCheckingValidity = _checkPostWeights(request, response)
  if (codeFromCheckingValidity !== 200) {
    // request already failed
    return
  }

  const task = request.params.task
  const id = request.params.id

  const buffer = getOrInitAsyncWeightsBuffer(task)

  const weights = getWeights(request)
  await writeWeights(task, weights)

  const round = request.body.round

  const codeFromAddingWeight = (await buffer.add(id, weights, round)) ? 200 : 202
  response.status(codeFromAddingWeight).send()
}

/**
 * Get the current round of the async weights holder
 *
 * @param request
 * @param response
 * @returns
 */
export async function getRound (request: Request, response: Response): Promise<void> {
  // Check for errors
  const type = RequestType.GetAsyncRound
  const code = _checkIfHasValidTaskAndId(request)
  if (code !== 200) {
    _failRequest(response, type, code)
    return
  }

  const task = request.params.task

  const buffer = getOrInitAsyncWeightsBuffer(task)

  // Get latest round
  const round = buffer.round

  // Send back latest round
  response.status(200).send({ round: round })
}

/**
 * Get the JSON containing statistics about the async weight buffer
 *
 * @param request
 * @param response
 * @returns
 */
export async function getAsyncWeightInformantStatistics (request: Request, response: Response): Promise<void> {
  // Check for errors
  const type = RequestType.GetAsyncRound
  const code = _checkIfHasValidTaskAndId(request)
  if (code !== 200) {
    _failRequest(response, type, code)
    return
  }

  const task = request.params.task
  // We can use the id of requester to compute weights distance serverside
  // const id = request.params.id

  getOrInitAsyncWeightsBuffer(task)

  // Get latest round
  const statistics = asyncInformantsMap.get(task)?.getAllStatistics()

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
export function postMetadata (request: Request, response: Response): void {
  const type = RequestType.PostMetadata

  const code = _checkRequest(request)
  if (code !== 200) {
    _failRequest(response, type, code)
    return
  }

  _logsAppend(request, type)

  const metadata = request.params.metadata
  const task = request.params.task
  const round = request.params.round
  const id = request.params.id

  if (request.body === undefined || request.body[metadata] === undefined) {
    _failRequest(response, type, 400)
    return
  }

  if (metadataMap.hasIn([task, round, id, metadata])) {
    throw new Error('metadata already set')
  }
  metadataMap.setIn([task, round, id, metadata], request.body[metadata])

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
export function getMetadataMap (request: Request, response: Response): void {
  const type = RequestType.GetMetadata

  const code = _checkRequest(request)
  if (code !== 200) {
    _failRequest(response, type, code)
    return
  }

  const metadata = request.params.metadata
  const task = request.params.task
  const round = Number.parseInt(request.params.round, 0)
  if (Number.isNaN(round)) {
    _failRequest(response, type, 400)
    return
  }

  // How did this work before?
  const taskMetadata = metadataMap.get(task)

  if (!(taskMetadata !== undefined && round >= 0)) {
    _failRequest(response, type, 404)
    return
  }

  _logsAppend(request, type)

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
  const queriedMetadataMap = immutable.Map(
    taskMetadata
      .get(latestRound, immutable.Map<string, immutable.Map<string, string>>())
      .filter((entries) => entries.has(metadata))
      .mapEntries(([id, entries]) => [id, entries.get(metadata)]))

  response.status(200).send({
    metadata: msgpack.encode(Array.from(queriedMetadataMap))
  })
}

/**
 * Request handler called when a client sends a GET request asking for all the
 * tasks metadata stored in the server's tasks.json file. This is used for
 * generating the client's list of tasks. It requires no prior connection to the
 * server and is thus publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getTasksMetadata (request: Request, response: Response): void {
  const type = RequestType.GetTasks
  if (fs.existsSync(CONFIG.tasksFile)) {
    _logsAppend(request, type)
    console.log(`Serving ${CONFIG.tasksFile as string}`)
    response.status(200).sendFile(CONFIG.tasksFile)
  } else {
    _failRequest(response, type, 404)
  }
}

/**
 * Request handler called when a client sends a GET request asking for the
 * TFJS model files of a given task. The files consist of the model's
 * architecture file model.json and its layer weights file weights.bin.
 * It requires no prior connection to the server and is thus publicly available
 * data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getLatestModel (request: Request, response: Response): void {
  const type = RequestType.GetWeights

  const task = request.params.task
  const file = request.params.file

  if (!tasksStatus.has(task)) {
    _failRequest(response, type, 404)
    return
  }
  const validModelFiles = new Set(['model.json', 'weights.bin', 'new_weights'])
  const modelFile = path.join(CONFIG.modelsDir, task, file)
  console.log(`File path: ${modelFile}`)
  if (validModelFiles.has(file) && fs.existsSync(modelFile)) {
    console.log(`${file} download for task ${task} succeeded`)
    response.status(200).sendFile(modelFile)
  } else {
    _failRequest(response, type, 404)
  }
}
