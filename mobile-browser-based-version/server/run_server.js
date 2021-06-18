const express               = require('express');
const fs                    = require('fs');
const cors                  = require('cors');
const path                  = require('path');
const { ExpressPeerServer } = require('peer');
const topologies            = require('./topologies.js');
const { makeId }            = require('./helpers.js');
const { models }            = require('./models.js');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

const topology = new topologies.BinaryTree()

const myArgs = process.argv.slice(2);

const server = app.listen(myArgs[0]);
const peerServer = ExpressPeerServer(server, {
    path: '/',
    allow_discovery: true,
    generateClientId: makeId(12)
});

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

Promise.all(models.map((createModel) => createModel()))

const tasksRouter = express.Router();
tasksRouter.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, myArgs[1]));
});
tasksRouter.get('/:id/:file', (req, res) => {
    res.sendFile(path.join(__dirname, req.params['id'], req.params['file']))
});

app.get('/', (req, res) => res.send('DeAI Server'));
app.use('/deai', peerServer);
app.get('/neighbours/:id', eventsHandler);
app.use('/tasks', tasksRouter);
