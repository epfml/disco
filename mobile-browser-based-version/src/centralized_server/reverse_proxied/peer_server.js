var express = require("express");
var app = express();
const { PeerServer } = require('peer');

// read params from config.json
const peerServer = PeerServer({
  port: 3001,
  path: '/peers',
  key: 'api',
  allow_discovery: true,
  proxied: true
});
