import { models } from './models.js';
import path from 'path';
import { averageWeights } from './tfjs_helpers.js';
import express from 'express';
import fs from 'fs';
import cors from 'cors';
import msgpack from 'msgpack-lite';

/*
 * Define a __dirname similar to CommonJS. We unpack the pathname
 * from the URL and use it in the path library. We do this instead
 * of directly working with URLs because the path library is just
 * easier to read, especially when functions don't support URL
 * objects.
 */
const __dirname = path.dirname(new URL(import.meta.url).pathname);
// JSON file containing all the tasks metadata
const TASKS_FILE = 'tasks.json';
// Fraction of client reponses required to complete communication round
const CLIENTS_THRESHOLD = 0.8;
// Save the averaged weights of each task to local storage every X rounds
const MODEL_SAVE_TIMESTEP = 5;
// Common error messages
const INVALID_REQUEST_FORMAT_MESSAGE =
  'Please pecify a client ID, round number and task ID.';
const INVALID_REQUEST_KEYS_MESSAGE = 'No entry matches the given keys.';

const app = express();
app.enable('trust proxy');
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.listen(8081); // Different port from Vue client

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

/**
 * Verifies that the given POST request is correctly formatted. Its body must
 * contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * The client must already be connected to the specified task before making any
 * subsequent POST requests related to training.
 * @param {Request} request received from client
 */
function isValidRequest(request) {
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
function logsAppend(request, type) {
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
function queryLogs(request, response) {
  const id = request.query.id;
  const task = request.query.task;
  const round = request.query.round;

  console.log(`Logs query: id: ${id}, task: ${task}, round: ${round}`);

  response
    .status(200)
    .send(
      logs.filter(
        entry =>
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
function connectToServer(request, response) {
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
function disconnectFromServer(request, response) {
  const id = request.params.id;
  const task = request.params.task;
  if (!(clients.has(task) && clients.get(task).includes(id))) {
    response.status(400).send(INVALID_REQUEST_KEYS_MESSAGE);
    return;
  }

  clients.set(
    task,
    clients.get(task).filter(clientId => clientId != id)
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
function sendIndividualWeights(request, response) {
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
  weightsMap
    .get(task)
    .get(round)
    .set(id, weights);
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
async function receiveAveragedWeights(request, response) {
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

  logsAppend(request, requestType);

  const receivedWeights = weightsMap.get(task).get(round);
  if (
    receivedWeights.size <
    Math.ceil(clients.get(task).length * CLIENTS_THRESHOLD)
  ) {
    response.status(200).send({});
    return;
  }

  // TODO: use proper average of model weights (can be copied from the frontend)
  const serializedWeights = await averageWeights(
    Array.from(receivedWeights.values())
  );
  const weightsJson = JSON.stringify(serializedWeights);

  if ((round - 1) % MODEL_SAVE_TIMESTEP == 0) {
    const weightsPath = `${task}_${round}_weights.json`;
    const milestonesPath = path.join(__dirname, 'milestones');
    if (!fs.existsSync(milestonesPath)) {
      fs.mkdirSync(milestonesPath);
    }
    fs.writeFile(path.join(milestonesPath, weightsPath), weightsJson, err => {
      if (err) {
        console.log(err);
        console.log(`Failed to save weights to ${weightsPath}`);
      } else {
        console.log(`Weights saved to ${weightsPath}`);
      }
    });
  }

  let weights = msgpack.encode(Array.from(serializedWeights));
  response.status(200).send({ weights: weights });
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
function sendDataSamplesNumber(request, response) {
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

  dataSamplesMap
    .get(task)
    .get(round)
    .set(id, samples);
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
function receiveDataSamplesNumbersPerClient(request, response) {
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

  response.status(200).send(Array.from(latestDataSamplesMap));

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
function getAllTasksData(request, response) {
  const tasksFilePath = path.join(__dirname, TASKS_FILE);
  if (fs.existsSync(tasksFilePath)) {
    console.log(`Serving ${tasksFilePath}`);
    response.status(200).sendFile(tasksFilePath);
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
function getInitialTaskModel(request, response) {
  const id = request.params.id;
  const file = request.params.file;
  const modelFiles = ['model.json', 'weights.bin'];
  const modelFilePath = path.join(__dirname, id, file);
  console.log(`File path: ${modelFilePath}`);
  if (modelFiles.includes(file) && fs.existsSync(modelFilePath)) {
    console.log(`${file} download for task ${id} succeeded`);
    response.status(200).sendFile(modelFilePath);
  } else {
    response.status(400).send({});
  }
}

// Asynchronously create and save Tensorflow models to local storage
Promise.all(models.map(createModel => createModel()));

// Initialize task-clients map
const tasksFilePath = path.join(__dirname, TASKS_FILE);
if (fs.existsSync(tasksFilePath)) {
  const tasks = JSON.parse(fs.readFileSync(tasksFilePath));
  tasks.forEach(task => {
    clients.set(task.taskID, []);
  });
}

// Configure server routing
const tasksRouter = express.Router();

tasksRouter.get('/', getAllTasksData);
tasksRouter.get('/:id/:file', getInitialTaskModel);

app.use('/tasks', tasksRouter);

app.get('/connect/:task/:id', connectToServer);
app.get('/disconnect/:task/:id', disconnectFromServer);

app.post('/send_weights/:task/:round', sendIndividualWeights);
app.post('/receive_weights/:task/:round', receiveAveragedWeights);

app.post('/send_nbsamples/:task/:round', sendDataSamplesNumber);
app.post('/receive_nbsamples/:task/:round', receiveDataSamplesNumbersPerClient);

app.get('/logs', queryLogs);

app.get('/', (req, res) => res.send('FeAI Server'));

export default app;
