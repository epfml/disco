import { agent as request } from "supertest";

import { serialization, Weights } from "discojs";

import * as tf from "@tensorflow/tfjs-node";
import app from "../../src/run_server";

const platformID = "feai";
const clients = {
  one: 'one',
  two: 'two'
}
const task = "titanic";

const weights: Weights = [tf.tensor([1, 1]), tf.tensor([1, 1])];

const newRound = 1;

function connectHeader(
  platformID: string,
  taskID: string,
  clientID: string
): string {
  return `/${platformID}/connect/${taskID}/${clientID}`;
}

function disconnectHeader(
  platformID: string,
  taskID: string,
  clientID: string
): string {
  return `/${platformID}/disconnect/${taskID}/${clientID}`;
}

function postWeightHeader(
  platformID: string,
  taskID: string,
  clientID: string
): string {
  return `/${platformID}/weights/${taskID}/${clientID}`;
}

describe(`${platformID} simple connection tests`, () => {
  it("connect and then disconnect to valid task", async () => {
    await request(app)
      .get(connectHeader(platformID, task, clients.one))
      .expect(200)
      .then(async () => {
        await request(app)
          .get(disconnectHeader(platformID, task, clients.one))
          .expect(200);
      });
  });

  it("connect to non existing task", async () => {
    // the single test
    await request(app)
      .get(connectHeader(platformID, "fakeTask", clients.one))
      .expect(404);
  });
});

describe(`${platformID} weight sharing tests`, () => {
  before(async () => {
    await request(app)
      .get(connectHeader(platformID, task, clients.one))
      .expect(200);
  });

  after(async () => {
    await request(app)
      .get(disconnectHeader(platformID, task, clients.one))
      .expect(200);
  });

  it('GET /weights', async () => { // the single test
      await request(app)
        .get(`/${platformID}/weights/${task}/${clients.one}`)
        .expect(200)
  })

  it("POST /weights", async () => {
    const data = {
      weights: await serialization.encodeWeights(weights),
      round: newRound,
    };
    await request(app)
      .post(postWeightHeader(platformID, task, clients.one))
      .send(data)
      .expect(200);
  });

  //TODO: Add a test with a whole round, etc

});
