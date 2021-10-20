const express = require('express');
const _ = require('lodash');
const { ExpressPeerServer } = require('peer');
const { makeId } = require('./helpers.js');
const { models } = require('./models.js');
const cors = require('cors');
const path = require('path');
const tasks = require('./tasks.json');
// reverse proxy
const { createProxyMiddleware } = require('http-proxy-middleware');
// server contants
const SERVER_PORT = 8080;
const START_TASK_PORT = 9000;
const TASK_PATH = taskId => `/deai/${taskId}`;
const HOST = `localhost` 
const HOST_FULL = port => `http://${HOST}:${String(port)}`;
// run models creation
Promise.all(models.map(createModel => createModel()));
/**
 * Creation and setup of Express App
 */
const app = express();
app.enable('trust proxy');
// use several middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// GAE requires the app to listen to 8080
app.listen(SERVER_PORT);

/**
 * Set up server for peerjs
 */
const ports = _.range(START_TASK_PORT, START_TASK_PORT + tasks.length);
_.forEach(
  _.zip(tasks, ports),
  _.spread((task, port) => {
    const taskId = task['taskId'];
    const task_app = express();
    const server = task_app.listen(port);
    task_app.use(
      TASK_PATH(taskId),
      ExpressPeerServer(server, {
        path: '/',
        allow_discovery: true,
        port: port,
        generateClientId: makeId(12),
        proxied: true,
      })
    );
    app.use(
      createProxyMiddleware(TASK_PATH(taskId), {
        target: HOST_FULL(port),
        changeOrigin: true, // needed for virtual hosted sites
        ws: true, // proxy websockets
      })
    );
  })
);
/**
 * Set up router for tasks
 */
const tasksRouter = express.Router();
tasksRouter.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'tasks.json'));
});
tasksRouter.get('/:id/:file', (req, res) => {
  res.sendFile(path.join(__dirname, req.params['id'], req.params['file']));
});
/**
 * Setup routes in Express app for previously defined servers and routers
 */
app.get('/', (req, res) => res.send('DeAI Server'));
app.use('/tasks', tasksRouter);
module.exports = app;

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