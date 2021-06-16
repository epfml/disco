const express               = require('express');
const fs                    = require('fs');
<<<<<<< HEAD
const cors                  = require('cors');
const path                  = require('path');
=======
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
const { ExpressPeerServer } = require('peer');
const topologies            = require('./topologies.js');
const { makeId }            = require('./helpers.js');
const { models }            = require('./models.js');

<<<<<<< HEAD
const myArgs = process.argv.slice(2);

const app = express();
app.use(cors());
=======

const myArgs = process.argv.slice(2);

const app = express();
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e

const server = app.listen(myArgs[0]);
const peerServer = ExpressPeerServer(server, {
    path: '/peerjs',
    key: 'api',
    allow_discovery: true,
    generateClientId: makeId(12)
});

<<<<<<< HEAD
var topology = new topologies.BinaryTree()
=======
var topology = new topologies.BinaryTree();
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e

peerServer.on('connection', (client) => {
    topology.addPeer(client.getId())
});

peerServer.on('disconnect', (client) => {
    topology.removePeer(client.getId())
});

<<<<<<< HEAD
Promise.all(models.map((createModel) => createModel()))

const tasksRouter = express.Router();
tasksRouter.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, myArgs[1]));
});
tasksRouter.get('/:id/:file', (req, res) => {
    res.sendFile(path.join(__dirname, req.params['id'], req.params['file']))
=======
const tasks = JSON.parse(fs.readFileSync(myArgs[1]));

const tasksRouter = express.Router();
tasksRouter.get('/', (req, res) => res.send(tasks));
tasks.forEach(task => {
    tasksRouter.get('/' + task.taskId, (req, res) => res.send(models.get(task.taskId)))
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
});

app.get('/', (req, res) => res.send('DeAI Server'));
app.use('/', peerServer);
app.get('/neighbours/:id', (req, res) => res.send(topology.getNeighbours(req.params['id'])));
app.use('/tasks', tasksRouter);
