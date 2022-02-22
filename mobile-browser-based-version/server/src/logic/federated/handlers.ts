import path from 'path'
import fs from 'fs'
import msgpack from 'msgpack-lite'
import * as config from '../../server.config'
import {
  averageWeights,
  assignWeightsToModel
} from '../../helpers/tfjs_helpers'
import { getTasks } from '../../tasks/helpers'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-node'

/**
 * Unique string identifiers for each type of request the federated
 * handlers are able to process. These strings are currently used
 * by the logs to identify the kind of requests that were performed.
 */
const REQUEST_TYPES = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SELECTION_STATUS: 'selection-status',
  AGGREGATION_STATUS: 'aggregation-status',
  POST_WEIGHTS: 'post-weights',
  GET_WEIGHTS: 'get-weights',
  POST_METADATA: 'post-metadata',

  GET_METADATA: 'get-metadata',
  GET_TASKS: 'get-tasks'
})
/**
 * Fraction of client gradients required on the final step of a round
 * to proceed to the aggregation step.
 */
const AGGREGATION_THRESHOLD = 0.8
/**
 * Absolute number of selected clients required to start the next round.
 */
const ROUND_THRESHOLD = 2
/**
 * Once a certain threshold has been hit, leave a small time window (in ms) for
 * late clients to join the next round.
 */
const ROUND_COUNTDOWN = 1000 * 10
/**
 * Once a certain threshold has been hit, leave a small time window (in ms) for
 * late clients to contribute to the round's aggregated model.
 */
const AGGREGATION_COUNTDOWN = 1000 * 3
/**
 * Clients that didn't emit any API request within this time delay (in ms) are
 * considered as idle and are consequently removed from the required data
 * structures.
 */
const IDLE_DELAY = 1000 * 10
/**
 * Same as IDLE_DELAY, except longer for clients that recently connected and thus
 * are not critical nodes (i.e. training nodes).
 */
const NEW_CLIENT_IDLE_DELAY = 1000 * 60
/**
 * Contains the model weights received from clients for a given task and round.
 * Stored by task ID, round number and client ID in a nested-map fashion.
 */
const weightsMap = new Map()
/**
 * Contains metadata used for training by clients for a given task and round.
 * Stored by task ID, round number and client ID in a nested-map fashion.
 */
const metadataMap = new Map()
/**
 * Flat array that contains all successful requests made to the server. An entry consists of:
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
 * Contains client IDs queued for the next round's selection. Maps a task ID to a set
 * of queued clients. Disconnected clients should always be removed from the
 * corresponding set of queued set.
 */
const selectedClientsQueue = new Map()
/**
 * Maps a task to a status object. Currently provides the round number and
 * round status for each task.
 */
const tasksStatus = new Map()
/**
 * Initialize the data structures declared above.
 */
getTasks(config)?.forEach((task) => {
  selectedClients.set(task.taskID, new Set())
  selectedClientsQueue.set(task.taskID, new Set())
  tasksStatus.set(task.taskID, { isRoundPending: false, round: 0 })
})

/**
 * Helper function. Verifies that the given request object's content fulfills several
 * format criterias. In particular, the request's body must contain its emitting client's
 * ID, training task and current round. Furthermore, the client must already be connected
 * to the specified task before making any subsequent requests related to training.
 * @param {Request} request The request received from client
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

/**
 * Helper function. Provides feedback on stdout after a request failed to be
 * processed. Sends a response with the provided (failure) status code.
 * @param {Response} response The request handler's response object
 * @param {String} type The type of the request
 * @param {Integer} code The (failure) HTTP status code
 */
function _failRequest(response, type, code) {
  console.log(`${type} failed with code ${code}`);
  response.status(code).send();
}

/**
 * Helper function. Appends the given request to the server logs.
 * @param {Request} request The request received from client
 * @param {String} type The type of the request
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

/**
 * Helper function. Attempts to start the next round. Called once a round has collected
 * enough weights from clients and the server aggregated them. If enough clients are
 * queued for selection, sets a timer at the end of which queued clients will be selected
 * (if enough of them remained connected in the mean time).
 * @param {String} task The task ID
 * @param {Number} threshold The minimum required number of clients queued for selection
 * @param {Number} countdown The time (ms) countdown before attempting to start the next round
 */
function _startNextRound(task, threshold, countdown) {
  let queueSize = selectedClientsQueue.get(task).size;
  if (queueSize >= threshold) {
    setTimeout(() => {
      queueSize = selectedClientsQueue.get(task).size
      if (queueSize >= threshold && !tasksStatus.get(task).isRoundPending) {
        tasksStatus.get(task).isRoundPending = true

        console.log('* queue: ', selectedClientsQueue.get(task))
        console.log('* selected clients: ', selectedClients.get(task))

        selectedClients.set(task, new Set([...selectedClientsQueue.get(task)]))
        selectedClientsQueue.get(task).clear()

        console.log('* empty queue: ', selectedClientsQueue.get(task))
        console.log('* new selected clients: ', selectedClients.get(task))
      }
    }, countdown)
  }
}

/**
 * Helper function. Aggregates the weights received for a given task and round.
 * Performs the aggregation with simple weights averaging. Saves the resulting
 * aggregated model to the server's local storage, hence effectively updating
 * the given task's model. Calling this function marks the end of the task's round
 * and thus the end-of-round routine is directly made within this function.
 * @param {String} task The task's ID
 * @param {Integer} round The task's round
 */
async function _aggregateWeights(task, round) {
  // TODO: check whether this actually works
  const serializedAggregatedWeights = await averageWeights(
    Array.from(weightsMap.get(task).get(round).values())
  )
  /**
   * Save the newly aggregated model to the server's local storage. This
   * is now the model served to clients for the given task. To save the newly
   * aggregated weights, here is the (cumbersome) procedure:
   * 1. create a new TFJS model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  console.log(`Updating ${task} model`)
  const modelFilesPath = config.SAVING_SCHEME.concat(
    path.join(config.MODELS_DIR, task, 'model.json')
  )
  const model = await tf.loadLayersModel(modelFilesPath)
  assignWeightsToModel(model, serializedAggregatedWeights)
  model.save(path.dirname(modelFilesPath))
  /**
   * The round has completed.
   */
  tasksStatus.get(task).isRoundPending = false
  /**
   * Communicate the correct round to selected clients.
   */
  tasksStatus.get(task).round += 1
  /**
   * Start next round.
   */
  _startNextRound(task, ROUND_THRESHOLD, ROUND_COUNTDOWN)
}

/**
 * Helper function. Called every time a client performs a successful request to the server.
 * Every client has their corresponding request counter stored server-side. The counters
 * are incremented when their clients perform a successful request. Then, calling this function
 * sets a timer at the end of which the given client will see its counter decremented. This timer
 * can be seen as a time frame during which the client is considered active. If the decremented counter
 * would be negative, the corresponding client is considered inactive and thus disconnected from
 * the server.
 * @param {String} client The client's ID
 * @param {Integer} delay The time (ms) countdown before which the client's activity
 * counter is decremented
 */
function _checkForIdleClients(client, delay) {
  setTimeout(() => {
    if (activeClients.has(client)) {
      console.log(`Checking ${client} for activity`)
      if (activeClients.get(client).requests === 0) {
        console.log(`Removing idle client ${client}`)
        clients.delete(client)
        activeClients.delete(client)
        selectedClients.delete(client)
        selectedClientsQueue.delete(client)
      } else {
        activeClients.get(client).requests -= 1
      }
    }
  }, delay)
}

/**
 * Request handler called when a client sends a GET request asking for the
 * activity history of the server (i.e. the logs). The client is allowed to be
 * more specific by providing a client ID, task ID or round number. Each
 * parameter is optional. It requires no prior connection to the server and is thus
 * publicly available metadata.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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
 * Request handler called when a client sends a GET request asking to get
 * selected by the server. The client is either:
 * - queued for later selection (code 0)
 * - late for selection (code 1)
 * - selected (code 2)
 * Code 0: The client is expected to ask for selection status again and will eventually
 * get selected (code 2).
 * Code 1: The client is expected to wait for the current round's weights to be aggregated.
 * Code 2: The client is expected to train locally for a few epochs.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
 */
export function selectionStatus(request, response) {
  const type = REQUEST_TYPES.SELECTION_STATUS;

  const task = request.params.task
  const id = request.params.id

  if (!clients.has(id)) {
    return _failRequest(response, type, 401)
  }
  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404)
  }

  _logsAppend(request, type)

  response.status(200)

  console.log(`Client with ID ${id} asked to get selected`)
  console.log('* selected clients: ', selectedClients.get(task))
  console.log('* queued clients: ', selectedClientsQueue.get(task))
  console.log(
    `=> selected? ${selectedClients.get(task).has(id) ? 'yes' : 'no'}`
  )

  if (selectedClients.get(task).has(id)) {
    /**
     * Selection status "2" means the client is selected by the server and can proceed
     * to the next round. The client that emitted the request updates their local round
     * with the one provided by the server.
     */
    response.send({ selected: 2, round: tasksStatus.get(task).round })
  } else if (tasksStatus.get(task).isRoundPending) {
    /**
     * If the round is pending, this means the client that requested
     * to be selected should now wait for weights aggregation from the server.
     * This ensures late clients start their rounds with the most recent model.
     */
    response.send({ selected: 1 })
  } else {
    selectedClientsQueue.get(task).add(id)
    response.send({ selected: 0 })
    _startNextRound(task, ROUND_THRESHOLD, ROUND_COUNTDOWN)
  }
  activeClients.get(id).requests += 1
  _checkForIdleClients(id, IDLE_DELAY)
}

/**
 * Entry point to the server's API. Any client must go through this connection
 * process before making any subsequent requests to the server related to
 * the training of a task.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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

  activeClients.set(id, { requests: 0 })
  _checkForIdleClients(id, NEW_CLIENT_IDLE_DELAY)
}

/**
 * Request handler called when a client sends a GET request notifying the server
 * it is disconnecting from a given task.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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
  selectedClients.get(task).delete(id)
  selectedClientsQueue.get(task).delete(id)

  console.log(`Client with ID ${id} disconnected from the server`)
  response.status(200).send()
}

/**
 * Request handler called when a client sends a POST request containing their
 * individual model weights to the server while training a task. The request is
 * made for a given task, round and client. The request's body must contain the client's
 * weights. If enough weights were received for the current round, aggregate the
 * weights and proceed to the next round.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
 */
export function postWeights (request, response) {
  const type = REQUEST_TYPES.POST_WEIGHTS

  const code = _checkRequest(request)
  if (code !== 200) {
    return _failRequest(response, type, code)
  }

  const task = request.params.task
  const round = request.params.round
  const id = request.params.id

  if (
    request.body === undefined ||
    request.body.weights === undefined ||
    request.body.weights.data === undefined
  ) {
    return _failRequest(response, type, 400)
  }

  const encodedWeights = request.body.weights

  _logsAppend(request, type)

  if (!weightsMap.has(task)) {
    weightsMap.set(task, new Map())
  }

  if (!weightsMap.get(task).has(round)) {
    weightsMap.get(task).set(round, new Map())
  }

  /**
   * Check whether the client already sent their local weights for this round.
   */
  if (!weightsMap.get(task).get(round).has(id)) {
    const weights = msgpack.decode(Uint8Array.from(encodedWeights.data))
    weightsMap.get(task).get(round).set(id, weights)
  }
  response.status(200).send()

  activeClients.get(id).requests += 1
  _checkForIdleClients(id, IDLE_DELAY)

  /**
   * Check whether enough clients sent their local weights to proceed to
   * weights aggregation.
   */
  if (
    weightsMap.get(task).get(round).size >=
    Math.round(selectedClients.get(task).size * AGGREGATION_THRESHOLD)
  ) {
    setTimeout(() => _aggregateWeights(task, round), AGGREGATION_COUNTDOWN)
  }
}

/**
 * Request handler called when a client sends a GET request asking for
 * the averaged model weights stored on the server while training a task. The
 * request is made for a given task, round and client. The request succeeds (code 1)
 * if CLIENTS_THRESHOLD % of clients sent their individual weights to the server
 * for the given task and round. Otherwise, it fails (code 0). On request success,
 * this handler performs weights aggregation and moves to the next round.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
 */
export async function aggregationStatus (request, response) {
  const type = REQUEST_TYPES.AGGREGATION_STATUS

  const task = request.params.task
  const round = request.params.round
  const id = request.params.id

  if (!clients.has(id)) {
    return _failRequest(response, type, 401)
  }
  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404)
  }

  _logsAppend(request, type)

  response.status(200)
  if (!(weightsMap.has(task) && weightsMap.get(task).has(round))) {
    /**
     * If the round has no weights entry, this must come
     * from a late client.
     */
    response.send({ aggregated: 0 })
  } else if (
    !tasksStatus.get(task).isRoundPending &&
    round < tasksStatus.get(task).round
  ) {
    /**
     * If aggregation occured, make the client wait to get selected for next round so
     * it can proceed to other jobs. Does nothing if this is a late client.
     */
    selectedClients.get(task).delete(id)
    response.send({ aggregated: 1 })
  } else if (
    weightsMap.get(task).get(round).size >=
    Math.round(selectedClients.get(task).size * AGGREGATION_THRESHOLD)
  ) {
    /**
     * To avoid any blocking state due to the disconnection of selected clients, allow
     * this request to perform aggregation. This is merely a safeguard. Ideally, this
     * should obviously be performed by the `postWeights` request handler directly, to
     * avoid any unnecesary delay.
     */
    setTimeout(() => _aggregateWeights(task, round), AGGREGATION_COUNTDOWN)
    response.send({ aggregated: 0 })
  }
  activeClients.get(id).requests += 1
  _checkForIdleClients(id, IDLE_DELAY)
}

/**
 * Request handler called when a client sends a POST request containing metadata
 * to the server while training a task's model. The request is made for a given task,
 * round, client and metadata. The request's body must contain the actual metadata's
 * content, while the metadata ID is specified in the handler's route.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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
  _checkForIdleClients(id, IDLE_DELAY)
}

/**
 * Request handler called when a client sends a GET request asking the server
 * for a metadata previously sent by clients in general. The request is made for
 * a given task, round, client and metadata. If there is no entry for the given round,
 * sends the most recent entry (round-wise) for each client involved in the task.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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
  _checkForIdleClients(id, IDLE_DELAY)
}

/**
 * Request handler called when a client sends a GET request asking for all the
 * tasks metadata stored in the server's tasks.json file. This is used by clients
 * to generate their list of tasks to the users. It requires no prior connection to
 * the server and is thus publicly available data.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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
 * TF.js model files of a given task. The files consist of the model's
 * architecture file (model.json) and its layer weights file (weights.bin) and
 * together define a task. This endpoint requires no prior connection to the
 * server and is thus publicly available data.
 * @param {Request} request The request received from client
 * @param {Response} response The response sent to client
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
