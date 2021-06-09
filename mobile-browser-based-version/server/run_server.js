const express = require('express');
const { ExpressPeerServer } = require('peer');
const cors = require('cors');
var topologies = require('./topologies.js')

var myArgs = process.argv.slice(2);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

const topology = new topologies.BinaryTree()
app.get('/', (req, res, next) => res.send('DeAI Server'));

const server = app.listen(myArgs[0]);

const peerServer = ExpressPeerServer(server, {
    path: '/',
    allow_discovery: true,
  });
app.use('/deai', peerServer);


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
    topology.addPeer(client.getId())
});

peerServer.on('disconnect', (client) => { 
    let affectedPeers = topology.removePeer(client.getId())
    sendNewNeighbours(affectedPeers)
});