/**
 * Test the server functionalities locally, without the need to run any client.
 * Run with `node test.js`
 */
import msgpack from 'msgpack-lite';
import { serializeWeights } from '../helpers/tfjs_helpers';
import assert from 'assert';
import { sleep } from './helpers';
import * as api from './api';

// Declare parameters for the requests below
const ids = ['a', 'b', 'c'];
const task = 'titanic';
const round = 0;
let response;
let body;
let model;
let weights;
const roundCountdown = 10;
const aggregationCountdown = 3;

/**
 * Naively tests all the API requests made available by the FeAI centralized
 * server from a single client's point of view. In the following scenario,
 * clients #{0, 1} are selected for rounds #{0, 1}, whereas client #2 only gets
 * selected for round #1.
 */
async function testServerRequests() {
  model = await api.getLatestModel(task);
  weights = msgpack.encode(Array.from(await serializeWeights(model.weights)));

  /**
   * Connect to the server with an non-existing task ID, expect an error status.
   */
  response = await api.connect('non_existing_task', ids[0]);
  assert.equal(response.ok, false);

  /**
   * Connect all three clients to the server.
   */
  for (const id of ids) {
    response = await api.connect(task, id);
    assert.equal(response.ok, true);
  }

  /**
   * Connect to the server with an already connected client ID, expect an error status.
   */
  response = await api.connect(task, ids[0]);
  assert.equal(response.ok, false);

  /**
   * Ask for selection status of client #0, expect failure.
   */
  response = await api.selectionStatus(task, ids[0]);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.selected, false);

  /**
   * Cause the next training round to start.
   */
  response = await api.selectionStatus(task, ids[1]);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.selected, false);

  console.log('Awaiting start of training round...');
  await sleep((roundCountdown + 2) * 1000);

  /**
   * Ask for selection status of clients #0 & #1, expect success.
   */
  for (const id of ids.slice(0, 2)) {
    response = await api.selectionStatus(task, id);
    assert.equal(response.ok, true);
    body = await response.json();
    assert.equal(body.selected, true);
    assert.equal(body.round, round);
  }

  /**
   * Ask for selection status of client #2, expect failure.
   */
  response = await api.selectionStatus(task, ids[2]);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.selected, false);

  /**
   * Send local weights for round #0.
   */
  response = await api.postWeights(task, round, ids[0], weights);
  assert.equal(response.ok, true);

  /**
   * Receive aggregation status for round #0. Expect failure as not enough
   * people sent their local weights for aggregation.
   */
  for (const id of ids.slice(0, 2)) {
    response = await api.aggregationStatus(task, round, id);
    assert.equal(response.ok, true);
    body = await response.json();
    assert.equal(await body.aggregated, false);
  }

  /**
   * Send local weights for round #0.
   */
  response = await api.postWeights(task, round, ids[1], weights);
  assert.equal(response.ok, true);

  console.log('Awaiting weights aggregation server-side...');
  await sleep((aggregationCountdown + 2) * 1000);

  /**
   * Receive aggregation status, expect success.
   */
  for (const id of ids.slice(0, 2)) {
    response = await api.aggregationStatus(task, round, id);
    assert.equal(response.ok, true);
    body = await response.json();
    assert.equal(await body.aggregated, true);
  }

  /**
   * Now that the aggregated model is available, update the local model.
   */
  model = await api.getLatestModel(task);
  weights = msgpack.encode(Array.from(await serializeWeights(model.weights)));

  for (const id of ids.slice(0, 2)) {
    response = await api.selectionStatus(task, id);
    assert.equal(response.ok, true);
    body = await response.json();
    assert.equal(body.selected, false);
  }

  console.log('Awaiting start of next round...');
  await sleep((roundCountdown + 2) * 1000);

  for (const id of ids) {
    response = await api.selectionStatus(task, id);
    assert.equal(response.ok, true);
    body = await response.json();
    assert.equal(body.selected, true);
    assert.equal(body.round, round + 1);
  }

  /**
   * Get server logs for own activity. Expect the list of all previous successful
   * requests.
   */
  response = await api.queryLogs(undefined, undefined, ids[0]);
  if (response.ok) console.log(await response.json());
  response = await api.queryLogs(task, undefined, undefined);
  if (response.ok) console.log(await response.json());
  response = await api.queryLogs(task, round, ids[0]);
  if (response.ok) console.log(await response.json());

  /**
   * Disconnect all clients from server.
   */
  for (const id of ids) {
    response = await api.disconnect(task, id);
    assert.equal(response.ok, true);
  }
}

testServerRequests().then(() => console.log('Tests successfully passed'));
