import { assert, expect } from "chai";
import { Repeat } from "immutable";
import type { Server } from "node:http";

import {
  Validator,
  ConsoleLogger,
  EmptyMemory,
  client as clients,
  aggregator,
  defaultTasks,
} from "@epfml/discojs";
import { parseCSV, parseImagesInDir } from "@epfml/discojs-node";

import { startServer } from "../src/index.js";

describe("validator", function () {
  this.timeout(10_000);

  let server: Server;
  let url: URL;
  beforeEach(async () => {
    [server, url] = await startServer();
  });
  afterEach(() => {
    server?.close();
  });

  it("can read and predict randomly on simple_face", async () => {
    const task = defaultTasks.simpleFace.getTask();

    // Load the data
    const [adult, child] = [
      (await parseImagesInDir("../datasets/simple_face/adult")).zip(
        Repeat("adult"),
      ),
      (await parseImagesInDir("../datasets/simple_face/child")).zip(
        Repeat("child"),
      ),
    ];

    const dataset = adult.chain(child);
    let size = 0;
    for await (const _ of dataset) size++;

    // Init a validator instance
    const meanAggregator = new aggregator.MeanAggregator();
    const client = new clients.Local(url, task, meanAggregator);
    meanAggregator.setModel(await client.getLatestModel());
    const validator = new Validator(
      task,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client,
    );

    // Read data and predict with an untrained model
    await validator.assess(["image", dataset]);
    assert(
      validator.visitedSamples === size,
      `Expected ${size} visited samples but got ${validator.visitedSamples}`,
    );
    assert(
      validator.accuracy > 0.3,
      `Expected random weight init accuracy greater than 0.3 but got ${validator.accuracy}`,
    );
  }).timeout(5_000);

  it("can read and predict randomly on titanic", async () => {
    const task = defaultTasks.titanic.getTask();

    // load dataset
    const dataset = parseCSV("../datasets/titanic_train.csv");
    let size = 0;
    for await (const _ of dataset) size++;

    const meanAggregator = new aggregator.MeanAggregator();
    const client = new clients.Local(url, task, meanAggregator);
    meanAggregator.setModel(await client.getLatestModel());
    const validator = new Validator(
      task,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client,
    );

    await validator.assess(["tabular", dataset]);

    expect(validator.visitedSamples).to.equal(size);
  }).timeout(1_000);

  it("can read and predict randomly on lus_covid", async () => {
    const task = defaultTasks.lusCovid.getTask();

    // Load the data
    const [positive, negative] = [
      (await parseImagesInDir("../datasets/lus_covid/COVID+")).zip(
        Repeat("COVID-Positive"),
      ),
      (await parseImagesInDir("../datasets/lus_covid/COVID-")).zip(
        Repeat("COVID-Negative"),
      ),
    ];
    const dataset = positive.chain(negative);
    let size = 0;
    for await (const _ of dataset) size++;

    // Initialize a validator instance
    const meanAggregator = new aggregator.MeanAggregator();
    const client = new clients.Local(url, task, meanAggregator);
    meanAggregator.setModel(await client.getLatestModel());

    const validator = new Validator(
      task,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client,
    );

    // Assert random initialization metrics
    await validator.assess(["image", dataset]);

    expect(validator.visitedSamples).to.equal(size);
  }).timeout(1000);
});
