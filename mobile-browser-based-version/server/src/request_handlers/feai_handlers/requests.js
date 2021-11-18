import path from 'path';
import fs from 'fs';
import msgpack from 'msgpack-lite';
import * as config from '../../../config.js';
import { averageWeights } from '../../helpers/tfjs_helpers.js';

/**
 * Fraction of client reponses required to complete communication round.
 */
const CLIENTS_THRESHOLD = 0.8;
/**
 * Save the averaged weights of each task to local storage every X rounds.
 */
const MODEL_SAVE_TIMESTEP = 5;
/**
 * Error message for requests not containing the required fields within its body.
 */
const INVALID_REQUEST_FORMAT_MESSAGE =
  'Please pecify a client ID, round number and task ID.';
/**
 * Error message for requests providing keys not contained within the server's
 * datastructures.
 */
const INVALID_REQUEST_KEYS_MESSAGE = 'No entry matches the given keys.';

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
/**
 * Clients (client IDs) currently connected to the the server. Stored per task.
 * This is used to ensure requests are made for existing tasks and connected
 * client IDs only.
 */
const clients = new Map();

// Initialize task-clients map
if (fs.existsSync(config.TASKS_FILE)) {
  const tasks = JSON.parse(fs.readFileSync(config.TASKS_FILE));
  tasks.forEach((task) => {
    clients.set(task.taskID, []);
  });
}

if (!fs.existsSync(config.MILESTONES_DIR)) {
  fs.mkdirSync(config.MILESTONES_DIR);
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
export function isValidRequest(request) {
  return (
    request !== undefined &&
    request.body !== undefined &&
    request.body.timestamp !== undefined &&
    typeof request.body.timestamp === 'string' &&
    request.params !== undefined &&
    clients.has(request.params.task) &&
    clients.get(request.params.task).includes(request.body.id) &&
    request.params.round >= 0
  );
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
    response.status(400).send(INVALID_REQUEST_KEYS_MESSAGE);
    return;
  }
  if (clients.get(task).includes(id)) {
    response
      .status(400)
      .send('Already connected to the server or ID already in use.');
    return;
  }
  clients.get(task).push(id);
  console.log(`Client with ID ${id} connected to the server`);
  response.status(200).send('Successfully connected to the server.');
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
  const id = request.params.id;
  const task = request.params.task;
  if (!(clients.has(task) && clients.get(task).includes(id))) {
    response.status(400).send(INVALID_REQUEST_KEYS_MESSAGE);
    return;
  }

  clients.set(
    task,
    clients.get(task).filter((clientId) => clientId != id)
  );
  console.log(`Client with ID ${id} disconnected from the server`);
  response.status(200).send('Successfully disconnected from the server.');
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
  const requestType = 'SEND_weights';

  if (!isValidRequest(request)) {
    response.status(400).send(INVALID_REQUEST_FORMAT_MESSAGE);
    console.log(`${requestType} failed`);
    return;
  }

  const id = request.body.id;
  const round = request.params.round;
  const task = request.params.task;

  if (!weightsMap.has(task)) {
    weightsMap.set(task, new Map());
  }

  if (!weightsMap.get(task).has(round)) {
    weightsMap.get(task).set(round, new Map());
  }

  const weights = msgpack.decode(Uint8Array.from(request.body.weights.data));
  weightsMap.get(task).get(round).set(id, weights);
  response.status(200).send('Weights successfully received.');

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
export async function receiveAveragedWeights(request, response) {
  const requestType = 'RECEIVE_weights';

  if (!isValidRequest(request)) {
    response.status(400).send(INVALID_REQUEST_FORMAT_MESSAGE);
    console.log(`${requestType} failed`);
    return;
  }

  const task = request.params.task;
  const round = request.params.round;

  if (!(weightsMap.has(task) && weightsMap.get(task).has(round))) {
    response.status(404).send(INVALID_REQUEST_KEYS_MESSAGE);
    console.log(`${requestType} failed`);
    return;
  }

  const receivedWeights = weightsMap.get(task).get(round);
  if (
    receivedWeights.size <
    Math.ceil(clients.get(task).length * CLIENTS_THRESHOLD)
  ) {
    response.status(400).send({});
    return;
  }

  // TODO: use proper average of model weights (can be copied from the frontend)
  const serializedWeights = await averageWeights(
    Array.from(receivedWeights.values())
  );
  const weightsJson = JSON.stringify(serializedWeights);

  if ((round - 1) % MODEL_SAVE_TIMESTEP == 0) {
    const milestoneFile = `weights_round${round}.json`;
    const milestoneDir = path.join(config.MILESTONES_DIR, task);
    if (!fs.existsSync(milestoneDir)) {
      fs.mkdirSync(milestoneDir);
    }
    fs.writeFile(path.join(milestoneDir, milestoneFile), weightsJson, (err) => {
      if (err) {
        console.log(err);
        console.log(`Failed to save weights to ${milestoneFile}`);
      } else {
        console.log(`Weights saved to ${milestoneFile}`);
      }
    });
  }

  let weights = msgpack.encode(Array.from(serializedWeights));
  response.status(200).send({ weights: weights });
  logsAppend(request, requestType);
  return;
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
  const requestType = 'SEND_nbsamples';

  if (!isValidRequest(request)) {
    response.status(400).send(INVALID_REQUEST_FORMAT_MESSAGE);
    console.log(`${requestType} failed`);
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
  response.status(200).send('Number of samples successfully received.');

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
  const requestType = 'RECEIVE_nbsamples';

  if (!isValidRequest(request)) {
    response.status(400).send(INVALID_REQUEST_FORMAT_MESSAGE);
    console.log(`${requestType} failed`);
    return;
  }

  const task = request.params.task;
  const round = request.params.round;

  if (!(dataSamplesMap.has(task) && round >= 0)) {
    response.status(404).send(INVALID_REQUEST_KEYS_MESSAGE);
    console.log(`${requestType} failed`);
    return;
  }

  /**
   * Find the most recent entry round-wise for the given task (upper bounded
   * by the given round).
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
    response.status(400).send({});
  }
}

/**
 * Request handler called when a client sends a GET request asking for the
 * TFJS model files of a given task. The files consist of the model's
 * architecture file model.json and its initial layer weights file weights.bin.
 * It requires no prior connection to the server and is thus publicly available
 * data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getInitialTaskModel(request, response) {
  const task = request.params.task;
  const file = request.params.file;
  const validModelFiles = ['model.json', 'weights.bin'];
  const modelFile = path.join(config.MODELS_DIR, task, file);
  console.log(`File path: ${modelFile}`);
  if (validModelFiles.includes(file) && fs.existsSync(modelFile)) {
    console.log(`${file} download for task ${task} succeeded`);
    response.status(200).sendFile(modelFile);
  } else {
    response.status(400).send({});
  }
}
