import path from 'path';
import fs from 'fs';
import msgpack from 'msgpack-lite';
import * as config from '../../../server.config.js';
import {
  averageWeights,
  assignWeightsToModel,
} from '../../helpers/tfjs_helpers.js';
import tasks from '../../tasks/tasks.js';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

const REQUEST_TYPES = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SELECTION_STATUS: 'selection-status',
  AGGREGATION_STATUS: 'aggregation-status',
  POST_WEIGHTS: 'post-weights',
  GET_WEIGHTS: 'get-weights',
  POST_SAMPLES: 'post-samples',
  GET_SAMPLES: 'get-samples',
  GET_TASKS: 'get-tasks',
});
/**
 * Fraction of client gradients required on final round of federated training
 * to proceed to the pooling step.
 */
const AGGREGATION_THRESHOLD = 0.8;
/**
 * Number of selected clients required to start federated training.
 */
const TRAINING_THRESHOLD = 2;
/**
 * Once a certain threshold has been hit, leave a small window for late clients
 * to join the next federated training session.
 */
const TRAINING_COUNTDOWN = 1000 * 10;

/**
 * Contains the model weights received from clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const weightsMap = new Map();
/**
 * Contains the number of data samples used for training by clients for a given
 * task and round. Stored by task ID, round number and client ID.
 */
const dataSamplesMap = new Map();
/**
 * Contains all successful requests made to the server. An entry consists of:
 * - a timestamp corresponding to the time at which the request was made
 * - the client ID used to make the request
 * - the task ID for which the request was made
 * - the round at which the request was made
 * - the request type (sending/receiving weights/metadata)
 */
const logs = [];

const clients = new Map();

const selectedClients = new Map();

const selectedClientsQueue = new Map();

const status = new Map();

tasks.forEach((task) => {
  clients.set(task.taskID, new Set());
  selectedClients.set(task.taskID, new Set());
  selectedClientsQueue.set(task.taskID, new Set());
  status.set(task.taskID, { training: false, round: 0 });
});

/**
 * Verifies that the given POST request is correctly formatted. Its body must
 * contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * The client must already be connected to the specified task before making any
 * subsequent POST requests related to training.
 * @param {Request} request received from client
 */
function checkRequest(request) {
  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (!(Number.isInteger(Number(round)) && round >= 0)) {
    return 400;
  }
  if (!(clients.has(task) && round <= status.get(task).round)) {
    return 404;
  }
  if (!clients.get(task).has(id)) {
    return 401;
  }
  if (!selectedClients.get(task).has(id)) {
    return 403;
  }
  return 200;
}

function failRequest(response, type, code) {
  console.log(`${type} failed with code ${code}`);
  response.status(code).send();
}

/**
 * Appends the given POST request's timestamp and type to the logs.
 * @param {Request} request received from client
 * @param {String} type of the request (send/receive weights/metadata)
 */
function logsAppend(request, type) {
  const timestamp = new Date();
  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;
  logs.push({
    timestamp: timestamp,
    task: task,
    round: round,
    client: id,
    request: type,
  });
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
export function queryLogs(request, response) {
  const task = request.query.task;
  const round = request.query.round;
  const id = request.query.id;

  console.log(`Logs query: task: ${task}, round: ${round}, id: ${id}`);

  response
    .status(200)
    .send(
      logs.filter(
        (entry) =>
          (id ? entry.client === id : true) &&
          (task ? entry.task === task : true) &&
          (round ? entry.round === round : true)
      )
    );
}

function startNextTrainingRound(task, threshold, countdown) {
  let selectedClientsSize = selectedClients.get(task).size;
  if (selectedClientsSize >= threshold) {
    console.log(
      `Fulfilled threshold of ${threshold}, ${selectedClientsSize} clients are selected`
    );
    setTimeout(() => {
      selectedClientsSize = selectedClients.get(task).size;
      if (selectedClientsSize >= threshold && !status.get(task).training) {
        console.log(`Training round #${status.get(task).round} started`);
        status.get(task).training = true;
      } else {
        console.log(
          `Some clients disconnected, only ${selectedClientsSize} are now selected`
        );
      }
    }, countdown);
  } else {
    console.log(
      `Only ${selectedClientsSize} clients are selected, ${threshold} required`
    );
  }
}

export function selectionStatus(request, response) {
  const type = REQUEST_TYPES.SELECTION_STATUS;

  const task = request.params.task;
  const id = request.params.id;

  if (!clients.has(task)) {
    return failRequest(response, type, 404);
  }

  logsAppend(request, type);

  const selected = {
    selected: true,
    round: status.get(task).round,
  };
  if (selectedClients.has(id)) {
    response.status(200).send(selected);
    return;
  }
  if (!status.get(task).training) {
    console.log(`Selected client with ID ${id}`);
    selectedClients.get(task).add(id);
    response.status(200).send(selected);
    startNextTrainingRound(task, TRAINING_THRESHOLD, TRAINING_COUNTDOWN);
    return;
  }
  selectedClientsQueue.get(task).add(id);
  response.status(200).send({ selected: false });
}

/**
 * Entry point to the server's API. Any client must go through this connection
 * process before making any subsequent POST requests to the server related to
 * the training of a task or metadata.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function connect(request, response) {
  const type = REQUEST_TYPES.CONNECT;

  const task = request.params.task;
  const id = request.params.id;

  if (!clients.has(task)) {
    return failRequest(response, type, 404);
  }
  if (clients.get(task).has(id)) {
    return failRequest(response, type, 401);
  }

  logsAppend(request, type);

  clients.get(task).add(id);
  console.log(`Client with ID ${id} connected to the server`);
  return response.status(200).send();
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
export function disconnect(request, response) {
  const type = REQUEST_TYPES.DISCONNECT;

  const task = request.params.task;
  const id = request.params.id;

  if (!(clients.has(task) && clients.get(task).has(id))) {
    return failRequest(response, type, 404);
  }

  logsAppend(request, type);

  clients.get(task).delete(id);
  selectedClients.get(task).delete(id);
  selectedClientsQueue.get(task).delete(id);

  console.log(`Client with ID ${id} disconnected from the server`);
  response.status(200).send();
}

/**
 * Request handler called when a client sends a POST request containing their
 * individual model weights to the server while training a task. The request is
 * made for a given task and round. The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * - the client's weights
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function postWeights(request, response) {
  const type = REQUEST_TYPES.POST_WEIGHTS;

  const code = checkRequest(request);
  if (code !== 200) {
    return failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (
    request.body === undefined ||
    request.body.weights === undefined ||
    request.body.weights.data === undefined
  ) {
    return failRequest(response, type, 400);
  }

  const encodedWeights = request.body.weights;

  if (!status.get(task).training) {
    return failRequest(response, type, 403);
  }

  logsAppend(request, type);

  if (!weightsMap.has(task)) {
    weightsMap.set(task, new Map());
  }

  if (!weightsMap.get(task).has(round)) {
    weightsMap.get(task).set(round, new Map());
  }

  /**
   * Check whether the client already sent their local weights for this round.
   */
  if (weightsMap.get(task).get(round).has(id)) {
    response.status(200).send();
    return;
  }

  const weights = msgpack.decode(Uint8Array.from(encodedWeights.data));
  weightsMap.get(task).get(round).set(id, weights);
  response.status(200).send();
}

/**
 * Request handler called when a client sends a POST request asking for
 * the averaged model weights stored on server while training a task. The
 * request is made for a given task and round. The request succeeds once
 * CLIENTS_THRESHOLD % of clients sent their individual weights to the server
 * for the given task and round. Every MODEL_SAVE_TIMESTEP rounds into the task,
 * the requested averaged weights are saved under a JSON file at milestones/.
 * The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export async function aggregationStatus(request, response) {
  const type = REQUEST_TYPES.AGGREGATION_STATUS;

  const code = checkRequest(request);
  if (code !== 200) {
    return failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;

  /**
   * The task was not trained at all.
   */
  if (!status.get(task).training && status.get(task).round === 0) {
    return failRequest(response, type, 403);
  }

  if (!(weightsMap.has(task) && weightsMap.get(task).has(round))) {
    return failRequest(response, type, 404);
  }

  logsAppend(request, type);

  /**
   * Ensure the requested round has been completed.
   */
  if (
    !status.get(task).training ||
    (status.get(task).training && round < status.get(task).round)
  ) {
    response.status(200).send({ aggregated: true });
    return;
  }

  const receivedWeights = weightsMap.get(task).get(round);
  /**
   * Ensure enough clients sent their local weights before proceeding to
   * aggregation.
   */
  if (
    receivedWeights.size <
    Math.round(selectedClients.get(task).size * AGGREGATION_THRESHOLD)
  ) {
    response.status(200).send({ aggregated: false });
    return;
  }

  // TODO: check whether this actually works
  const serializedAggregatedWeights = await averageWeights(
    Array.from(receivedWeights.values())
  );
  /**
   * Save the newly aggregated model to local storage. This is now
   * the model served to clients for the given task. To save the newly
   * aggregated weights, here is the (cumbersome) procedure:
   * 1. create a new TFJS model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  console.log(`Updating ${task} model`);
  const modelFilesPath = config.SAVING_SCHEME.concat(
    path.join(config.MODELS_DIR, task, 'model.json')
  );
  const model = await tf.loadLayersModel(modelFilesPath);
  assignWeightsToModel(model, serializedAggregatedWeights);
  model.save(path.dirname(modelFilesPath));

  /**
   * Training round has completed. Make the new client selection
   * based off the current queue.
   */
  console.log('Proceeding to next training round');
  selectedClients.get(task).clear();
  for (const client of selectedClientsQueue.get(task)) {
    selectedClients.get(task).add(client);
  }
  selectedClientsQueue.get(task).clear();

  /**
   * Enable new selection of clients.
   */
  status.get(task).training = false;
  /**
   * Communicate the correct round to selected clients.
   */
  status.get(task).round += 1;

  /**
   * Start the next training round.
   */
  startNextTrainingRound(task, TRAINING_THRESHOLD, TRAINING_COUNTDOWN);
  response.status(200).send({ aggregated: true });
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
 *
 */
export function postSamples(request, response) {
  const type = REQUEST_TYPES.POST_SAMPLES;

  const code = checkRequest(request);
  if (code !== 200) {
    return failRequest(response, type, code);
  }

  logsAppend(request, type);

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (request.body === undefined || request.body.samples === undefined) {
    return failRequest(response, type, 400);
  }

  const samples = request.body.samples;

  if (!dataSamplesMap.has(task)) {
    dataSamplesMap.set(task, new Map());
  }
  if (!dataSamplesMap.get(task).has(round)) {
    dataSamplesMap.get(task).set(round, new Map());
  }

  dataSamplesMap.get(task).get(round).set(id, samples);
  response.status(200).send();
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
export function getSamplesMap(request, response) {
  const type = REQUEST_TYPES.GET_SAMPLES;

  const code = checkRequest(request);
  if (code !== 200) {
    return failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;

  if (!(dataSamplesMap.has(task) && round >= 0)) {
    return failRequest(response, type, 404);
  }

  logsAppend(request, type);

  /**
   * Find the most recent entry round-wise for the given task (upper bounded
   * by the given round). Allows for sporadic entries in the samples map.
   */
  const allRounds = Array.from(dataSamplesMap.get(task).keys());
  const latestRound = allRounds.reduce((prev, curr) =>
    prev <= curr && curr <= round ? curr : prev
  );
  const latestDataSamplesMap = new Map(
    dataSamplesMap.get(task).get(latestRound)
  );

  const samples = msgpack.encode(Array.from(latestDataSamplesMap));
  response.status(200).send({ samples: samples });
}

/**
 * Request handler called when a client sends a GET request asking for all the
 * tasks metadata stored in the server's tasks.json file. This is used for
 * generating the client's list of tasks. It requires no prior connection to the
 * server and is thus publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getTasksMetadata(request, response) {
  const type = REQUEST_TYPES.GET_TASKS;
  if (fs.existsSync(config.TASKS_FILE)) {
    logsAppend(request, type);
    console.log(`Serving ${config.TASKS_FILE}`);
    response.status(200).sendFile(config.TASKS_FILE);
  } else {
    failRequest(response, type, 404);
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
export function getLatestModel(request, response) {
  const type = REQUEST_TYPES.GET_WEIGHTS;

  const task = request.params.task;
  const file = request.params.file;

  if (!clients.has(task)) {
    return failRequest(response, type, 404);
  }
  const validModelFiles = new Set(['model.json', 'weights.bin']);
  const modelFile = path.join(config.MODELS_DIR, task, file);
  console.log(`File path: ${modelFile}`);
  if (validModelFiles.has(file) && fs.existsSync(modelFile)) {
    console.log(`${file} download for task ${task} succeeded`);
    response.status(200).sendFile(modelFile);
  } else {
    failRequest(response, type, 404);
  }
}
