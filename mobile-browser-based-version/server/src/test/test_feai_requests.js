/**
 * Test the server functionalities locally, without the need to run any client.
 * Run with `node test.js`
 */
import msgpack from 'msgpack-lite';
import { serializeWeights } from '../helpers/tfjs_helpers.js';
import assert from 'assert';
import { sleep } from './helpers.js';
import * as api from './api.js';

// Declare parameters for the requests below
var ids = ['a', 'b', 'c'];
var task = 'titanic';
var round = 0;
var response;
var body;
var model;
var weights;

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
  for (let id of ids) {
    response = await api.connect(task, id);
    assert.equal(response.ok, true);
  }

  /**
   * Connect to the server with an already connected client ID, expect an error status.
   */
  response = await api.connect(task, ids[0]);
  assert.equal(response.ok, false);

  /**
   * Ask for selection status of client #0, expect success.
   */
  response = await api.selectionStatus(task, ids[0]);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.selected, true);
  assert.equal(body.round, round);

  /**
   * Ask for selection status of client #1, expect success.
   */
  response = await api.selectionStatus(task, ids[1]);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.selected, true);
  assert.equal(body.round, round);

  /**
   * Wait for start of training round.
   */
  console.log('Await start of training round');
  await sleep(1000 * 12);

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
   * Receive aggreation status for the final epoch of round #0, i.e. epoch #9.
   * Expect failure as not enough people sent their local weights for aggregation.
   */
  response = await api.aggregationStatus(task, round, ids[0], 9);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(await body.aggregated, false);

  /**
   * Send local weights for round #0.
   */
  response = await api.postWeights(task, round, ids[1], weights);
  assert.equal(response.ok, true);

  /**
   * Receive aggregation status for epoch #8 of round #0. Expect failure as the
   * training duration of 10 epochs has not been respected.
   */
  response = await api.aggregationStatus(task, round, ids[0], 8);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.aggregated, false);

  /**
   * Receive aggregation status on the final epoch of round #0, i.e. epoch #9.
   * Expect success.
   */
  response = await api.aggregationStatus(task, round, ids[0], 9);
  assert.equal(response.ok, true);
  body = await response.json();
  assert.equal(body.aggregated, true);

  /**
   * Now that the aggregated model is available, update the local model.
   */
  model = await api.getLatestModel(task);
  weights = msgpack.encode(Array.from(await serializeWeights(model.weights)));

  /**
   * Expect success, especially for the client #2 which must have been
   * queued up for selection during the previous training round.
   */
  for (let id of ids) {
    response = await api.selectionStatus(task, id);
    assert.equal(response.ok, true);
    body = await response.json();
    assert.equal(body.selected, true);
    assert.equal(body.round, round + 1);
  }

  /**
   * Get server logs for own activity. Expect the list of all previous POST
   * requests.
   */
  console.log(await api.queryLogs({ clientID: ids[0] }));
  console.log(await api.queryLogs({ taskID: task }));
  console.log(
    await api.queryLogs({ taskID: task, round: round, clientID: ids[0] })
  );

  /**
   * Disconnect from server
   */
  for (let id of ids) {
    response = await api.disconnect(task, id);
    assert.equal(response.ok, true);
  }
}

testServerRequests().then(() => console.log('Tests successfully passed'));
