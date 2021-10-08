const express = require('express');
const { ExpressPeerServer } = require('peer');
const { makeId } = require('./helpers.js');
const { models } = require('./models.js');
const cors = require('cors');
const path = require('path');

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
const server = app.listen(8080);
/**
 * Set up server for peerjs
 */
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true,
  generateClientId: makeId(12),
});
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
app.use('/deai', peerServer);
app.use('/tasks', tasksRouter);
module.exports = app;
