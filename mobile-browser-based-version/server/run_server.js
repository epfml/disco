const express               = require('express');
const fs                    = require('fs');
const cors                  = require('cors');
const path                  = require('path');
const { ExpressPeerServer } = require('peer');
const topologies            = require('./topologies.js');
const { makeId }            = require('./helpers.js');
const { models }            = require('./models.js');

const myArgs = process.argv.slice(2);

const app = express();
app.use(cors());

const server = app.listen(myArgs[0]);
const peerServer = ExpressPeerServer(server, {
    path: '/peerjs',
    key: 'api',
    allow_discovery: true,
    generateClientId: makeId(12)
});

var topology = new topologies.BinaryTree();

peerServer.on('connection', (client) => {
    topology.addPeer(client.getId())
});

peerServer.on('disconnect', (client) => {
    topology.removePeer(client.getId())
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
app.use('/', peerServer);
app.get('/neighbours/:id', (req, res) => res.send(topology.getNeighbours(req.params['id'])));
app.use('/tasks', tasksRouter);
