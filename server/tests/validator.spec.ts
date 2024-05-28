import { expect } from "chai";
import { Repeat } from "immutable";
import type * as http from "node:http";

import {
  Validator,
  ConsoleLogger,
  EmptyMemory,
  client as clients,
  aggregator as aggregators,
  defaultTasks,
} from "@epfml/discojs";
import { loadCSV, loadImagesInDir } from "@epfml/discojs-node";

import { Server } from "../src/index.js";

describe("validator", function () {
  this.timeout("10s");

  let server: http.Server;
  let url: URL;
  beforeEach(async () => {
    [server, url] = await Server.of(
      defaultTasks.simpleFace,
      defaultTasks.lusCovid,
      defaultTasks.titanic,
    ).then((s) => s.serve());
  });
  afterEach(() => server?.close());

  it("can read and predict randomly on simple_face", async () => {
    const task = defaultTasks.simpleFace.getTask();

    const [adult, child] = [
      (await loadImagesInDir("../datasets/simple_face/adult")).zip(
        Repeat("adult"),
      ),
      (await loadImagesInDir("../datasets/simple_face/child")).zip(
        Repeat("child"),
      ),
    ];
    const dataset = adult.chain(child);

    // Init a validator instance
    const meanAggregator = aggregators.getAggregator(task, { scheme: "local" });
    const client = new clients.Local(url, task, meanAggregator);
    const validator = new Validator(
      task,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client,
    );

    for await (const _ of validator.test(["image", dataset]));

    expect(validator.visitedSamples).to.equal(await dataset.size());
    expect(validator.accuracy).to.be.greaterThan(0.3);
  }).timeout("5s");

  it("can read and predict randomly on titanic", async () => {
    const task = defaultTasks.titanic.getTask();

    const dataset = loadCSV("../datasets/titanic_train.csv");

    const meanAggregator = aggregators.getAggregator(task, { scheme: "local" });
    const client = new clients.Local(url, task, meanAggregator);
    const validator = new Validator(
      task,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client,
    );

    for await (const _ of validator.test(["tabular", dataset]));

    expect(validator.visitedSamples).to.equal(await dataset.size());
    expect(validator.accuracy).to.be.greaterThan(0.3);
  }).timeout("1s");

  it("can read and predict randomly on lus_covid", async () => {
    const task = defaultTasks.lusCovid.getTask();

    // Load the data
    const [positive, negative] = [
      (await loadImagesInDir("../datasets/lus_covid/COVID+")).zip(
        Repeat("COVID-Positive"),
      ),
      (await loadImagesInDir("../datasets/lus_covid/COVID-")).zip(
        Repeat("COVID-Negative"),
      ),
    ];
    const dataset = positive.chain(negative);

    // Initialize a validator instance
    const meanAggregator = aggregators.getAggregator(task, { scheme: "local" });
    const client = new clients.Local(url, task, meanAggregator);
    const validator = new Validator(
      task,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client,
    );

    // Assert random initialization metrics
    for await (const _ of validator.test(["image", dataset]));

    expect(validator.visitedSamples).to.equal(await dataset.size());
    expect(validator.accuracy).to.be.greaterThan(0.3);
  }).timeout("1s");
});
