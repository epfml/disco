import express from 'express';
import _ from 'lodash';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as requests from '../request_handlers/feai_handlers/requests.js';
import * as config from '../../config.js';
import tasks from '../tasks/tasks.js';
import { makeID } from '../helpers/helpers.js';
import { ExpressPeerServer } from 'peer';

// General tasks routes

const tasksRouter = express.Router();
tasksRouter.get('/', requests.getAllTasksData);
tasksRouter.get('/:task/:file', requests.getInitialTaskModel);

// Declare FeAI routes
const feaiRouter = express.Router();
feaiRouter.get('/', (req, res) => res.send('FeAI server'));

feaiRouter.get('/connect/:task/:id', requests.connectToServer);
feaiRouter.get('/disconnect/:task/:id', requests.disconnectFromServer);

feaiRouter.post('/send_weights/:task/:round', requests.sendIndividualWeights);
feaiRouter.post(
  '/receive_weights/:task/:round',
  requests.receiveAveragedWeights
);

feaiRouter.post('/send_nbsamples/:task/:round', requests.sendDataSamplesNumber);
feaiRouter.post(
  '/receive_nbsamples/:task/:round',
  requests.receiveDataSamplesNumbersPerClient
);

feaiRouter.use('/tasks', tasksRouter);

feaiRouter.get('/logs', requests.queryLogs);

// Declare DeAI routes
const deaiRouter = express.Router();

const ports = _.range(
  config.START_TASK_PORT,
  config.START_TASK_PORT + tasks.length
);
_.forEach(
  _.zip(tasks, ports),
  _.spread((task, port) => {
    const taskApp = express();
    const server = taskApp.listen(port);
    taskApp.use(
      `/${task.taskID}`,
      ExpressPeerServer(server, {
        path: '/',
        allow_discovery: true,
        port: port,
        generateClientId: makeID(12),
        proxied: true,
      })
    );
    deaiRouter.use(
      createProxyMiddleware(`/${task.taskID}`, {
        target: `${config.SERVER_URI}:${String(port)}`,
        changeOrigin: true, // needed for virtual hosted sites
        ws: true, // proxy websockets
      })
    );
  })
);

deaiRouter.use('/tasks', tasksRouter);

export { feaiRouter, deaiRouter };

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
