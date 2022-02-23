import express from 'express'
import _ from 'lodash'
import * as handlers from '../logic/federated/request_handlers'
import { writeNewTask, getTasks } from '../tasks/tasks_io'
import { ExpressPeerServer } from 'peer'
import { makeID } from './authenticator'
import { createProxyMiddleware } from 'http-proxy-middleware'
import * as config from '../server.config'

const tasks = getTasks(config)

// General tasks routes
const tasksRouter = express.Router()
tasksRouter.get('/', handlers.getTasksMetadata)
tasksRouter.get('/:task/:file', handlers.getLatestModel)
// POST method route (task-creation-form)
tasksRouter.post('/', function (req, res) {
  const newTask = req.body
  const newPort = config.START_TASK_PORT + tasks?.length
  if (newTask.taskID in tasks) { console.log('Cannot add new task (key is already defined in Tasks.json)') } else {
    // extract model file from tasks
    const modelFile = _.cloneDeep(newTask.modelFiles.modelFile)
    const weightsFile = _.cloneDeep(newTask.modelFiles.weightsFile)
    _.unset(newTask, 'modelFiles')
    _.unset(newTask, 'weightsFiles')
    // create new task and server
    ports.push(newPort)
    tasks.push(newTask)
    createTaskServer(newTask, newPort)
    // store results in json file
    writeNewTask(newTask, modelFile, weightsFile, config)
    // answer vue app
    res.end('Successfully upload')
  }
})
// Declare federated routes
const federatedRouter = express.Router()
federatedRouter.get('/', (req, res) => res.send('FeAI server'))

federatedRouter.get('/connect/:task/:id', handlers.connect)
federatedRouter.get('/disconnect/:task/:id', handlers.disconnect)

federatedRouter.get('/selection/:task/:id', handlers.selectionStatus)

federatedRouter.get(
  '/aggregation/:task/:round/:id',
  handlers.aggregationStatus
)

federatedRouter.post('/weights/:task/:round/:id', handlers.postWeights)

federatedRouter.post('/async/weights/:task/:id', handlers.postAsyncWeights)

federatedRouter.get('/async/round/:task/:id', handlers.getAsyncRound)

federatedRouter
  .route('/metadata/:metadata/:task/:round/:id')
  .get(handlers.getMetadataMap)
  .post(handlers.postMetadata)

federatedRouter.get('/logs', handlers.queryLogs)

federatedRouter.use('/tasks', tasksRouter)

// =======================================================================

// Declaire decentralised routes
const decentralisedRouter = express.Router()
/**
 * Set up server for peerjs
 */
const ports = _.range(
  config.START_TASK_PORT,
  config.START_TASK_PORT + tasks?.length
)
const createTaskServer = (task, port) => {
  /**
   * Create a PeerJS server for each task on its corresponding port.
   * The path must match the reverse proxy entry point.
   */
  const taskApp = express()
  const server = taskApp.listen(port)
  taskApp.use(
    `/deai/${task.taskID}`,
    ExpressPeerServer(server, {
      path: '/',
      allow_discovery: true,
      port: port,
      generateClientId: makeID(10),
      proxied: true
    })
  )

  /**
   * Make the peer server's port accessible from a regular URL
   * on the DeAI server.
   */
  decentralisedRouter.use(
    createProxyMiddleware(`/deai/${task.taskID}`, {
      target: `${config.SERVER_URI}:${port}`,
      changeOrigin: true,
      ws: true
    })
  )
}
_.forEach(_.zip(tasks, ports), _.spread(createTaskServer))

decentralisedRouter.use('/tasks', tasksRouter)
decentralisedRouter.get('/', (req, res) => res.send('DeAI server'))

export { federatedRouter, decentralisedRouter }

// Custom topology code (currently unused)
/*
const topology = new topologies.BinaryTree();
let peers = [];
function eventsHandler(request, response, next) {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);
    let peerId = request.params['id']
    console.log(peerId)
    const data = `data: ${JSON.stringify(topology.getNeighbours(peerId))}\n\n`;
    response.write(data);

    const newPeer = {
      id: peerId,
      response
    };
    peers.push(newPeer);

    request.on('close', () => {
      console.log(`${peerId} Connection closed`);
      peers = peers.filter(peer => peer.id !== peerId);
    });
    // call next middleware
    next()
  }
  function sendNewNeighbours(affectedPeers) {
    let peersToNotify = peers.filter(peer => affectedPeers.has(peer.id) )
    peersToNotify.forEach(peer => peer.response.write(`data: ${JSON.stringify(topology.getNeighbours(peer.id))}\n\n`))
  }
peerServer.on('connection', (client) => {
    let affectedPeers = topology.addPeer(client.getId())
    sendNewNeighbours(affectedPeers)
});
peerServer.on('disconnect', (client) => {
    let affectedPeers = topology.removePeer(client.getId())
    sendNewNeighbours(affectedPeers)
});
app.get('/neighbours/:id', eventsHandler);
*/
