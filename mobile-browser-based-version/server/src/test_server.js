/**
 * Test the server functionalities locally, without the need to run any client.
 * Run with `node test.js`
 */
import { serializeWeights } from './helpers/tfjs_helpers.js';
import msgpack from 'msgpack-lite';
import fetch from 'node-fetch';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

/**
 * Naively tests all the API requests made available by the FeAI centralized
 * server from a single client's point of view.
 */
async function testServerRequests() {
  let server = 'http://localhost:8081';
  // Declare parameters for the requests below
  let id = '09az';
  let round = 1;
  let task = 'titanic';
  let model = await tf.loadLayersModel(`${server}/tasks/${task}/model.json`);
  let weights = msgpack.encode(
    Array.from(await serializeWeights(model.weights))
  );
  let nbsamples = 5000;
  let headers = {
    'Content-Type': 'application/json',
  };

  /**
   * Connect to the server.
   */
  let response = await fetch(`${server}/connect/${task}/${id}`);
  console.log(response.ok == true);

  /**
   * Connect to the server again with the same client ID, expect an error status.
   */
  response = await fetch(`${server}/connect/${task}/${id}`);
  console.log(response.ok == false);

  /**
   * Connect to the server with an non-existing task ID, expect an error status.
   */
  response = await fetch(`${server}/connect/non_existing_task/${id}`);
  console.log(response.ok == false);

  /**
   * Send local weights for round #1.
   */
  response = await fetch(`${server}/send_weights/${task}/${round}`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      id: id,
      timestamp: new Date(),
      weights: weights,
    }),
  });
  console.log(response.ok == true);

  /**
   * Receive averaged weights for round #1.
   */
  response = await fetch(`${server}/receive_weights/${task}/${round}`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      id: id,
      timestamp: new Date(),
    }),
  })
    .then(response => response.json())
    .then(body => msgpack.decode(Uint8Array.from(body.weights.data)));
  console.log(response);

  /**
   * Send number of samples for rounds #{1, 2, 3}.
   */
  for (let i = 0; i < 3; i++) {
    response = await fetch(`${server}/send_nbsamples/${task}/${round + i}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        id: id,
        timestamp: new Date(),
        samples: nbsamples + i,
      }),
    });
    console.log(response.ok == true);
  }

  /**
   * Receive number of samples per client for round #4. Expects metadata from the
   * latest round with information, i.e. round #3.
   */
  response = await fetch(`${server}/receive_nbsamples/${task}/${round + 3}`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      id: id,
      timestamp: new Date(),
    }),
  }).then(response => response.json());
  console.log(response);

  /**
   * Get server logs for own activity. Expects the list of all previous POST
   * requests.
   */
  response = await fetch(`${server}/logs?id=${id}`).then(response =>
    response.json()
  );
  console.log(response);

  response = await fetch(`${server}/logs?task=${task}`).then(response =>
    response.json()
  );
  console.log(response);

  response = await fetch(
    `${server}/logs?id=${id}&task=${task}&round=${round}`
  ).then(response => response.json());
  console.log(response);

  /**
   * Disconnect from server
   */
  response = await fetch(`${server}/disconnect/${task}/${id}`);
  console.log(response.ok == true);
}

testServerRequests();
