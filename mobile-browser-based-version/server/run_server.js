const express               = require('express');
const fs                    = require('fs');
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
    path: '/peerjs',
    key: 'api',
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
  
  app.get('/neighbours/:id', eventsHandler);

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

const tasks = JSON.parse(fs.readFileSync(myArgs[1]));

const tasksRouter = express.Router();
tasksRouter.get('/', (req, res) => res.send(tasks));
tasks.forEach(task => {
    tasksRouter.get('/' + task.taskId, (req, res) => res.send(models.get(task.taskId)))
});

app.get('/', (req, res) => res.send('DeAI Server'));
app.use('/', peerServer);
app.get('/neighbours/:id', eventsHandler);
app.use('/tasks', tasksRouter);