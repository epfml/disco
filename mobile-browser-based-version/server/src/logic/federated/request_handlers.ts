import path from 'path'
import fs from 'fs'
import msgpack from 'msgpack-lite'
import * as config from '../../server.config'
import {
  averageWeights
} from './tensor_helpers/tensor_operations'
import {
  assignWeightsToModel
} from './tensor_helpers/tensor_serializer'
import { getTasks } from '../../tasks/tasks_io'
import { AsyncWeightsBuffer } from './async_weights_buffer'
import { AsyncWeightsInformant } from './async_weights_informant'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-node'

const REQUEST_TYPES = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SELECTION_STATUS: 'selection-status',
  AGGREGATION_STATUS: 'aggregation-status',
  POST_WEIGHTS: 'post-weights',
  POST_ASYNC_WEIGHTS: 'post-async-weights',
  GET_WEIGHTS: 'get-weights',
  POST_METADATA: 'post-metadata',
  GET_ASYNC_ROUND: 'get-async-round',
  GET_METADATA: 'get-metadata',
  GET_TASKS: 'get-tasks'
})

/**
 * Contains the model weights received from clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const asyncWeightsMap: Map<string, AsyncWeightsBuffer> = new Map()
const BUFFER_CAPACITY = 2
/**
 * Contains the informants for each task. 
 */
 const asyncWeightsInformantsMap: Map<string, AsyncWeightsInformant> = new Map()
/**
 * Contains metadata used for training by clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const metadataMap = new Map()
/**
 * Contains all successful requests made to the server. An entry consists of:
 * - a timestamp corresponding to the time at which the request was made
 * - the client ID used to make the request
 * - the task ID for which the request was made
 * - the round at which the request was made
 * - the request type
 */
const logs = []
/**
 * Contains client IDs currently connected to one of the server.
 * Disconnected clients should always be removed from this set
 */
const clients = new Set()
/**
 * Contains client IDs and their amount of recently emitted API requests.
 * This allows us to check whether clients were active within a certain time interval
 * and thus remove possibly AFK clients.
 */
const activeClients = new Map()
/**
 * Contains client IDs selected for the current round. Maps a task ID to a set of
 * selected clients. Disconnected clients should always be removed from the
 * corresponding set of selected clients.
 */
const selectedClients = new Map()
/**
 * Maps a task to a status object. Currently provides the round number and
 * round status for each task.
 */
const tasksStatus = new Map()
/**
 * Initialize the data structures declared above.
 */
getTasks(config)?.forEach((task) => {
  tasksStatus.set(task.taskID, { isRoundPending: false, round: 0 })
  _initAsyncWeightsBufferIfNotExists(task)
})

// Inits the AsyncWeightsBuffer for the task if it does not yet exist.
function _initAsyncWeightsBufferIfNotExists (task) {
  if (!asyncWeightsMap.has(task)) {
    const _taskAggregateAndStoreWeights = (weights: any) => _aggregateAndStoreWeights(weights, task)
    asyncWeightsMap.set(task, new AsyncWeightsBuffer(task, BUFFER_CAPACITY, _taskAggregateAndStoreWeights))
    asyncWeightsInformantsMap.set(task.taskID,  new AsyncWeightsInformant(task.taskID, asyncWeightsMap.get(task)))
  }
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
function _checkRequest (request) {
  const task = request.params.task
  const round = request.params.round
  const id = request.params.id

  if (!(Number.isInteger(Number(round)) && round >= 0)) {
    return 400
  }
  if (!(tasksStatus.has(task) && round <= tasksStatus.get(task).round)) {
    return 404
  }
  if (!clients.has(id)) {
    return 401
  }
  if (!selectedClients.get(task).has(id)) {
    return 403
  }
  return 200
}

function _checkIfHasValidTaskAndId (request) {
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

function _failRequest (response, type, code) {
  console.log(`${type} failed with code ${code}`)
  response.status(code).send()
  return code
}

/**
 * Appends the given request to the server logs.
 * @param {Request} request received from client
 * @param {String} type of the request
 */
function _logsAppend (request, type) {
  const timestamp = new Date()
  const task = request.params.task
  const round = request.params.round
  const id = request.params.id
  logs.push({
    timestamp: timestamp,
    task: task,
    round: round,
    client: id,
    request: type
  })
}

async function _aggregateAndStoreWeights (weights, task) {
  // TODO: check whether this actually works
  const serializedAggregatedWeights = await averageWeights(
    weights
  )
  /**
   * Save the newly aggregated model to the server's local storage. This
   * is now the model served to clients for the given task. To save the newly
   * aggregated weights, here is the (cumbersome) procedure:
   * 1. create a new TFJS model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  const modelFilesPath = config.SAVING_SCHEME.concat(
    path.join(config.MODELS_DIR, task, 'model.json')
  )
  const model = await tf.loadLayersModel(modelFilesPath)
  assignWeightsToModel(model, serializedAggregatedWeights)
  model.save(path.dirname(modelFilesPath))
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
export function queryLogs (request, response) {
  const task = request.query.task
  const round = request.query.round
  const id = request.query.id

  console.log(`Logs query: task: ${task}, round: ${round}, id: ${id}`)

  response
    .status(200)
    .send(
      logs.filter(
        (entry) =>
          (id ? entry.client === id : true) &&
          (task ? entry.task === task : true) &&
          (round ? entry.round === round : true)
      )
    )
}

/**
 * Entry point to the server's API. Any client must go through this connection
 * process before making any subsequent POST requests to the server related to
 * the training of a task or metadata.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function connect (request, response) {
  const type = REQUEST_TYPES.CONNECT

  const task = request.params.task
  const id = request.params.id

  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404)
  }
  if (clients.has(id)) {
    return _failRequest(response, type, 401)
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
export function disconnect (request, response) {
  const type = REQUEST_TYPES.DISCONNECT

  const task = request.params.task
  const id = request.params.id

  if (!(tasksStatus.has(task) && clients.has(id))) {
    return _failRequest(response, type, 404)
  }

  _logsAppend(request, type)

  clients.delete(id)
  activeClients.delete(id)

  console.log(`Client with ID ${id} disconnected from the server`)
  response.status(200).send()
}

/**
 * Checks if the request is valid for post async weights.
 * @param request
 * @param response
 * @returns
 */
function _checkPostWeights (request, response) {
  const type = REQUEST_TYPES.POST_ASYNC_WEIGHTS

  const code = _checkIfHasValidTaskAndId(request)
  if (code !== 200) {
    return _failRequest(response, type, code)
  }

  if (
    request.body === undefined ||
    request.body.round === undefined ||
    request.body.weights === undefined ||
    request.body.weights.data === undefined
  ) {
    return _failRequest(response, type, 400)
  }

  return 200
}

function _decodeWeights (request) {
  const encodedWeights = request.body.weights
  return msgpack.decode(Uint8Array.from(encodedWeights.data))
}

/**
 * Post weights to the async weights holder, returns true in response if successful, and false otherwise.
 * It is successful if task and user id exist + weight corresponds to a recent round (see AsyncWeightHolder class for more info on this).
 * @param request
 * @param response
 * @returns
 */
export async function postWeights (request, response) {
  const codeFromCheckingValidity = _checkPostWeights(request, response)
  if (codeFromCheckingValidity !== 200) {
    return codeFromCheckingValidity
  }

  const task = request.params.task
  const id = request.params.id

  _initAsyncWeightsBufferIfNotExists(task)

  const weights = _decodeWeights(request)

  const round = request.body.round
  const codeFromAddingWeight = await asyncWeightsMap.get(task).add(id, weights, round) ? 200 : 202
  response.status(codeFromAddingWeight).send()
}

/**
 * Get the current round of the async weights holder
 *
 * @param request
 * @param response
 * @returns
 */
export async function getRound (request, response) {
  // Check for errors
  const type = REQUEST_TYPES.GET_ASYNC_ROUND
  const code = _checkIfHasValidTaskAndId(request)
  if (code !== 200) {
    return _failRequest(response, type, code)
  }

  const task = request.params.task

  _initAsyncWeightsBufferIfNotExists(task)

  // Get latest round
  const round = asyncWeightsMap.get(task).round

  // Send back latest round
  response.status(200).send({ round: round })
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
export function postMetadata (request, response) {
  const type = REQUEST_TYPES.POST_METADATA

  const code = _checkRequest(request)
  if (code !== 200) {
    return _failRequest(response, type, code)
  }

  _logsAppend(request, type)

  const metadata = request.params.metadata
  const task = request.params.task
  const round = request.params.round
  const id = request.params.id

  if (request.body === undefined || request.body[metadata] === undefined) {
    return _failRequest(response, type, 400)
  }

  if (!metadataMap.has(task)) {
    metadataMap.set(task, new Map())
  }
  if (!metadataMap.get(task).has(round)) {
    metadataMap.get(task).set(round, new Map())
  }
  if (!metadataMap.get(task).get(round).has(id)) {
    metadataMap.get(task).get(round).set(id, new Map())
  }
  if (!metadataMap.get(task).get(round).get(id).has(metadata)) {
    metadataMap
      .get(task)
      .get(round)
      .get(id)
      .set(metadata, request.body[metadata])
  }
  response.status(200).send()

  activeClients.get(id).requests += 1
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
export function getMetadataMap (request, response) {
  const type = REQUEST_TYPES.GET_METADATA

  const code = _checkRequest(request)
  if (code !== 200) {
    return _failRequest(response, type, code)
  }

  const metadata = request.params.metadata
  const task = request.params.task
  const round = request.params.round
  const id = request.params.id

  // How did this work before?
  const queriedMetadataMap = new Map()
  let metadataMap = msgpack.encode(Array.from(queriedMetadataMap))

  if (!(metadataMap.has(task) && round >= 0)) {
    return _failRequest(response, type, 404)
  }

  _logsAppend(request, type)

  /**
   * Find the most recent entry round-wise for the given task (upper bounded
   * by the given round). Allows for sporadic entries in the metadata map.
   */
  const allRounds = Array.from(metadataMap.get(task).keys())
  const latestRound = allRounds.reduce((prev, curr) =>
    prev <= curr && curr <= round ? curr : prev
  )
  /**
   * Fetch the required metadata from the general metadata structure stored
   * server-side and construct the queried metadata's map accordingly. This
   * essentially creates a "ID -> metadata" single-layer map.
   */
  for (const [id, entries] of metadataMap.get(task).get(latestRound)) {
    if (entries.has(metadata)) {
      queriedMetadataMap.set(id, entries.get(metadata))
    }
  }
  metadataMap = msgpack.encode(Array.from(queriedMetadataMap))

  response.status(200).send({ metadata: metadataMap })

  activeClients.get(id).requests += 1
}

/**
 * Request handler called when a client sends a GET request asking for all the
 * tasks metadata stored in the server's tasks.json file. This is used for
 * generating the client's list of tasks. It requires no prior connection to the
 * server and is thus publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getTasksMetadata (request, response) {
  const type = REQUEST_TYPES.GET_TASKS
  if (fs.existsSync(config.TASKS_FILE)) {
    _logsAppend(request, type)
    console.log(`Serving ${config.TASKS_FILE}`)
    response.status(200).sendFile(config.TASKS_FILE)
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
export function getLatestModel (request, response) {
  const type = REQUEST_TYPES.GET_WEIGHTS

  const task = request.params.task
  const file = request.params.file

  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404)
  }
  const validModelFiles = new Set(['model.json', 'weights.bin'])
  const modelFile = path.join(config.MODELS_DIR, task, file)
  console.log(`File path: ${modelFile}`)
  if (validModelFiles.has(file) && fs.existsSync(modelFile)) {
    console.log(`${file} download for task ${task} succeeded`)
    response.status(200).sendFile(modelFile)
  } else {
    _failRequest(response, type, 404)
  }
}
