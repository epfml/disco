const express = require('express');
const { ExpressPeerServer } = require('peer');

const app = express();

const server = app.listen(3000);

const peerServer = ExpressPeerServer(server, {
  path: '/peers',
  key: 'api'
});

app.use('/', peerServer);
// TODO: send json responses containing tasks information
app.get('/tasks', (req, res) => res.send('Hello world! from TASK SERVER.'))
