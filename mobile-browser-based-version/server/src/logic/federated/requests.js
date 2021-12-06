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
  SEND_WEIGHTS: 'weights-send',
  RECEIVE_WEIGHTS: 'receive-weights',
  AGGREGATION_STATUS: 'aggregation-status',
  SEND_SAMPLES: 'samples-send',
  RECEIVE_SAMPLES: 'samples-receive',
});
/**
 * Fraction of client gradients required on final round of federated training
 * to proceed to the pooling step.
 */
const AGGREGATION_THRESHOLD = 0.8;
/**
 * Proceed to the round's aggregation step after X training epochs.
 */
const TRAINING_DURATION = 10;
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
export function checkRequest(request) {
  if (
    !(
      request !== undefined &&
      request.body !== undefined &&
      request.body.timestamp !== undefined &&
      typeof request.body.timestamp === 'string' &&
      request.params !== undefined &&
      typeof request.params.task === 'string' &&
      typeof request.params.round === 'string' &&
      Number.isInteger(Number(request.params.round)) &&
      request.params.round >= 0
    )
  ) {
    return 400;
  }

  const id = request.body.id;
  const task = request.params.task;
  const round = request.params.round;

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

/**
 * Appends the given POST request's timestamp and type to the logs.
 * @param {Request} request received from client
 * @param {String} type of the request (send/receive weights/metadata)
 */
export function logsAppend(request, type) {
  const id = request.body.id;
  const timestamp = request.body.timestamp;
  const task = request.params.task;
  const round = request.params.round;
  logs.push({
    timestamp: timestamp,
    clientId: id,
    taskID: task,
    round: round,
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
  const id = request.query.id;
  const task = request.query.task;
  const round = request.query.round;

  console.log(`Logs query: id: ${id}, task: ${task}, round: ${round}`);

  response
    .status(200)
    .send(
      logs.filter(
        (entry) =>
          (id ? entry.clientId === id : true) &&
          (task ? entry.taskID === task : true) &&
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

export function receiveSelectionStatus(request, response) {
  const requestType = REQUEST_TYPES.SELECTION_STATUS;
  const task = request.params.task;
  const id = request.params.id;
  if (!clients.has(task)) {
    console.log(`${requestType} failed with code 404`);
    response.status(404).send();
  }
  logsAppend(request, requestType);
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
export function connectToServer(request, response) {
  const id = request.params.id;
  const task = request.params.task;
  if (!clients.has(task)) {
    response.status(404).send();
    return;
  }
  if (clients.get(task).has(id)) {
    response.status(401).send();
    return;
  }
  clients.get(task).add(id);
  console.log(`Client with ID ${id} connected to the server`);
  response.status(200).send();
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
export function disconnectFromServer(request, response) {
  const task = request.params.task;
  const id = request.params.id;
  if (!(clients.has(task) && clients.get(task).has(id))) {
    response.status(404).send();
    return;
  }

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
export function sendIndividualWeights(request, response) {
  const requestType = REQUEST_TYPES.SEND_WEIGHTS;

  const httpStatus = checkRequest(request);
  if (httpStatus !== 200) {
    response.status(httpStatus).send();
    console.log(`${requestType} failed with code ${httpStatus}`);
    return;
  }
  const round = request.params.round;
  const task = request.params.task;
  const id = request.body.id;
  const encodedWeights = request.body.weights;

  if (!status.get(task).training) {
    response.status(403).send();
    console.log(`${requestType} failed with code 403`);
    return;
  }

  if (!(encodedWeights !== undefined && encodedWeights.data !== undefined)) {
    response.status(400).send();
    console.log(`${requestType} failed with code 400`);
    return;
  }

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

  logsAppend(request, requestType);
  return;
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
export async function receiveWeightsAggregationStatus(request, response) {
  const requestType = REQUEST_TYPES.AGGREGATION_STATUS;

  const httpStatus = checkRequest(request);
  if (httpStatus !== 200) {
    response.status(httpStatus).send();
    console.log(`${requestType} failed with code ${httpStatus}`);
    return;
  }

  const task = request.params.task;
  const round = request.params.round;
  const epoch = request.body.epoch;

  /**
   * The task was not trained at all.
   */
  if (!status.get(task).training && status.get(task).round === 0) {
    response.status(403).send();
    console.log(`${requestType} failed with code 403`);
    return;
  }

  if (!(weightsMap.has(task) && weightsMap.get(task).has(round))) {
    response.status(404).send();
    console.log(`${requestType} failed with code 404`);
    return;
  }

  logsAppend(request, requestType);

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
  /**
   * Ensure the request is made only once the client has finished their training
   * round, i.e. they trained for the whole required set of epochs.
   */
  if (epoch + 1 < TRAINING_DURATION * (round + 1)) {
    response.status(200).send({ aggregated: false });
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
export function sendDataSamplesNumber(request, response) {
  const requestType = REQUEST_TYPES.SEND_SAMPLES;

  const httpStatus = checkRequest(request);
  if (httpStatus !== 200) {
    response.status(httpStatus).send();
    console.log(`${requestType} failed with code ${httpStatus}`);
    return;
  }

  const id = request.body.id;
  const samples = request.body.samples;
  const task = request.params.task;
  const round = request.params.round;

  if (!dataSamplesMap.has(task)) {
    dataSamplesMap.set(task, new Map());
  }
  if (!dataSamplesMap.get(task).has(round)) {
    dataSamplesMap.get(task).set(round, new Map());
  }

  dataSamplesMap.get(task).get(round).set(id, samples);
  response.status(200).send();

  logsAppend(request, requestType);
  return;
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
export function receiveDataSamplesNumbersPerClient(request, response) {
  const requestType = REQUEST_TYPES.RECEIVE_SAMPLES;

  const httpStatus = checkRequest(request);
  if (httpStatus !== 200) {
    response.status(httpStatus).send();
    console.log(`${requestType} failed with code ${httpStatus}`);
    return;
  }

  const task = request.params.task;
  const round = request.params.round;

  if (!(dataSamplesMap.has(task) && round >= 0)) {
    response.status(404).send();
    console.log(`${requestType} failed with code 404`);
    return;
  }

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
  logsAppend(request, requestType);
  return;
}

/**
 * Request handler called when a client sends a GET request asking for all the
 * tasks metadata stored in the server's tasks.json file. This is used for
 * generating the client's list of tasks. It requires no prior connection to the
 * server and is thus publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getAllTasksData(request, response) {
  if (fs.existsSync(config.TASKS_FILE)) {
    console.log(`Serving ${config.TASKS_FILE}`);
    response.status(200).sendFile(config.TASKS_FILE);
  } else {
    response.status(404).send();
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
export function getLatestTaskModel(request, response) {
  const task = request.params.task;
  const file = request.params.file;

  if (!clients.has(task)) {
    response.status(404).send();
    return;
  }
  const validModelFiles = new Set(['model.json', 'weights.bin']);
  const modelFile = path.join(config.MODELS_DIR, task, file);
  console.log(`File path: ${modelFile}`);
  if (validModelFiles.has(file) && fs.existsSync(modelFile)) {
    console.log(`${file} download for task ${task} succeeded`);
    response.status(200).sendFile(modelFile);
  } else {
    response.status(404).send();
  }
}
