const express = require('express');
const { ExpressPeerServer } = require('peer');

function makeid() {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 12; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function()

const app = express();
const server = app.listen(3000);
const peerServer = ExpressPeerServer(server, {
  path: '/peers',
  key: 'api',
  allow_discovery: true,
  generateClientId: makeid
});

app.use('/', peerServer);
// TODO: send json responses containing tasks information
app.get('/tasks', (req, res) => res.send('Hello world! from TASK SERVER.'))
