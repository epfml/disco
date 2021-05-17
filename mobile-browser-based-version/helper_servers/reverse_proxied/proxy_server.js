var express  = require('express');
var app = express();
var httpProxy = require('http-proxy');
var apiProxy = httpProxy.createProxyServer();

// read ports from config.json
var peerServer = 'http://localhost:3001';
var taskServer = 'http://localhost:3002';


app.all("/peers*", (req, res) => {
    console.log('redirecting to PEER SERVER');
    apiProxy.web(req, res, { target: peerServer });
});

app.all("/tasks*", (req, res) => {
    console.log('redirecting to TASK SERVER');
    apiProxy.web(req, res, { target: taskServer });
});

// start proxy
app.listen(3000);
