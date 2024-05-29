import path from "node:path";
import type { Server } from "node:http";
import { List, Repeat } from "immutable";
import { assert, expect } from "chai";

import type { RoundLogs, Text, WeightsContainer } from "@epfml/discojs";
import {
  Disco,
  client as clients,
  aggregator as aggregators,
  defaultTasks,
  Dataset,
} from "@epfml/discojs";
import { parseCSV, parseImagesInDir, parseText } from "@epfml/discojs-node";

import { startServer } from "../../src/index.js";

describe("end-to-end federated", function () {
  let server: Server;
  let url: URL;
  beforeEach(async function () {
    this.timeout("5s");
    [server, url] = await startServer();
  });
  afterEach(() => {
    server?.close();
  });

  const DATASET_DIR = path.join("..", "datasets");

  async function cifar10user(): Promise<WeightsContainer> {
    // TODO single label means to model can't be wrong

    const dataset = (
      await parseImagesInDir(path.join(DATASET_DIR, "CIFAR10"))
    ).zip(Repeat("cat"));

    const cifar10Task = defaultTasks.cifar10.getTask();

    const aggregator = new aggregators.MeanAggregator();
    const client = new clients.federated.FederatedClient(
      url,
      cifar10Task,
      aggregator,
    );
    const disco = new Disco(cifar10Task, { scheme: "federated", client });

    for await (const _ of disco.fit(["image", dataset]));
    await disco.close();

    if (aggregator.model === undefined) throw new Error("model was not set");
    return aggregator.model.weights;
  }

  async function titanicUser(): Promise<WeightsContainer> {
    const task = defaultTasks.titanic.getTask();
    task.trainingInformation.epochs = 5;

    const dataset = parseCSV(path.join(DATASET_DIR, "titanic_train.csv"));

    const aggregator = new aggregators.MeanAggregator();
    const client = new clients.federated.FederatedClient(url, task, aggregator);
    const disco = new Disco(task, { scheme: "federated", client, aggregator });

    let logs = List<RoundLogs>();
    for await (const round of disco.fit(["tabular", dataset]))
      logs = logs.push(round);
    await disco.close();

    expect(logs.last()?.epochs.last()?.training.accuracy).to.be.greaterThan(
      0.6,
    );
    if (logs.last()?.epochs.last()?.validation === undefined)
      throw new Error(
        "No validation logs while validation dataset was specified",
      );
    const validationLogs = logs.last()?.epochs.last()?.validation;
    expect(validationLogs?.accuracy).to.be.greaterThan(0.6);

    if (aggregator.model === undefined) throw new Error("model was not set");
    return aggregator.model.weights;
  }

  async function wikitextUser(): Promise<void> {
    const task = defaultTasks.wikitext.getTask();
    task.trainingInformation.epochs = 2;
    const dataset: Dataset<Text> = parseText(
      path.join(DATASET_DIR, "wikitext", "wiki.train.tokens"),
    ).chain(parseText(path.join(DATASET_DIR, "wikitext", "wiki.valid.tokens")));

    const aggregator = new aggregators.MeanAggregator();
    const client = new clients.federated.FederatedClient(url, task, aggregator);
    const disco = new Disco(task, { scheme: "federated", client, aggregator });

    let logs = List<RoundLogs>();
    for await (const round of disco.fit(["text", dataset]))
      logs = logs.push(round);
    await disco.close();

    expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
      logs.last()?.epochs.last()?.training.loss as number,
    );
  }

  async function lusCovidUser(): Promise<WeightsContainer> {
    const lusCovidTask = defaultTasks.lusCovid.getTask();
    lusCovidTask.trainingInformation.epochs = 15;

    const [positive, negative] = [
      (await parseImagesInDir(
        path.join(DATASET_DIR, "lus_covid", "COVID+"),
      )).zip(Repeat("COVID-Positive")),
      (await parseImagesInDir(
        path.join(DATASET_DIR, "lus_covid", "COVID-"),
      )).zip(Repeat("COVID-Negative"))
    ];
    const dataset = positive.chain(negative);

    const aggregator = new aggregators.MeanAggregator();
    const client = new clients.federated.FederatedClient(
      url,
      lusCovidTask,
      aggregator,
    );
    const disco = new Disco(lusCovidTask, { scheme: "federated", client });

    let logs = List<RoundLogs>();
    for await (const round of disco.fit(["image", dataset]))
      logs = logs.push(round);
    await disco.close();

    if (aggregator.model === undefined) {
      throw new Error("model was not set");
    }
    const validationLogs = logs.last()?.epochs.last()?.validation;
    expect(validationLogs?.accuracy).to.be.greaterThan(0.6);
    return aggregator.model.weights;
  }

  it("three cifar10 users reach consensus", async function () {
    this.timeout(90_000);

    const [m1, m2, m3] = await Promise.all([
      cifar10user(),
      cifar10user(),
      cifar10user(),
    ]);
    assert.isTrue(m1.equals(m2) && m2.equals(m3));
  });

  it("two titanic users reach consensus", async function () {
    this.timeout(30_000);

    const [m1, m2] = await Promise.all([titanicUser(), titanicUser()]);
    assert.isTrue(m1.equals(m2));
  });
  it("two lus_covid users reach consensus", async function () {
    this.timeout("3m");

    const [m1, m2] = await Promise.all([lusCovidUser(), lusCovidUser()]);
    assert.isTrue(m1.equals(m2));
  });

  it("trains wikitext", async function () {
    this.timeout("3m");

    await wikitextUser();
  });
});
