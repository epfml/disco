const express = require('express')
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

const { PeerServer } = require('peer');
const peerServer = PeerServer({ port: 9000, path: '/myapp' });

const model = tf.sequential();
model.add(tf.layers.dense({units: 32, inputShape: [50]}));
model.add(tf.layers.dense({units: 4}));

model.save('file://.');

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Decentralized ML app')
})

app.get('/model', function(req, res){
  const file = `./model.json`;
  res.download(file);
});

app.get('/weights', function(req, res){
  const file = `./weights.bin`;
  res.download(file);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})