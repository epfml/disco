const express = require('express');
const { ExpressPeerServer } = require('peer');
var topologies = require('./topologies.js')

var myArgs = process.argv.slice(2);

const app = express();

const topology = new topologies.BinaryTree()
app.get('/', (req, res, next) => res.send('DeAI Server'));
app.get('/neighbours/:id', (req, res, next) => res.send(topology.getNeighbours(req.params['id'])));

const server = app.listen(myArgs[0]);

const peerServer = ExpressPeerServer(server, {
    path: '/',
    allow_discovery: true,
  });
app.use('/deai', peerServer);


peerServer.on('connection', (client) => { 
    topology.addPeer(client.getId())
});

peerServer.on('disconnect', (client) => { 
    topology.removePeer(client.getId())
});