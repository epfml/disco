import { assert, expect } from "chai";
import { List, Repeat } from "immutable";
import type * as http from "node:http";
import path from "node:path";

import type { WeightsContainer } from "@epfml/discojs";
import { Disco, defaultTasks } from "@epfml/discojs";
import { loadCSV, loadImagesInDir, loadText } from "@epfml/discojs-node";

import { Server } from "../../src/index.js";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) {
    // TODO trick to allow other Promises to run
    // else one client might progress alone without communicating with others
    // will be fixed when client orchestrations in the server is correctly done
    await new Promise((resolve) => setTimeout(resolve, 10));

    ret.push(e);
  }
  return ret;
}

describe("end-to-end federated", () => {
  let server: http.Server;
  let url: URL;
  beforeEach(async function () {
    this.timeout("5s");
    [server, url] = await Server.of(
      defaultTasks.cifar10,
      defaultTasks.lusCovid,
      defaultTasks.titanic,
      defaultTasks.wikitext,
    ).then((s) => s.serve());
  });
  afterEach(() => {
    server?.close();
  });

  const DATASET_DIR = path.join("..", "datasets");

  async function cifar10user(): Promise<WeightsContainer> {
    // TODO single label means to model can't be wrong

    const dataset = (
      await loadImagesInDir(path.join(DATASET_DIR, "CIFAR10"))
    ).zip(Repeat("cat"));

    const disco = await Disco.fromTask(defaultTasks.cifar10.getTask(), url, {
      scheme: "federated",
    });

    await disco.trainFully(["image", dataset]);
    await disco.close();

    return disco.trainer.model.weights;
  }

  async function titanicUser(): Promise<WeightsContainer> {
    const task = defaultTasks.titanic.getTask();
    task.trainingInformation.epochs =
      task.trainingInformation.roundDuration = 5;

    const dataset = loadCSV(path.join(DATASET_DIR, "titanic_train.csv"));

    const titanicTask = defaultTasks.titanic.getTask();
    titanicTask.trainingInformation.epochs =
      titanicTask.trainingInformation.roundDuration = 5;
    const disco = await Disco.fromTask(titanicTask, url, {
      scheme: "federated",
    });

    const logs = List(
      await arrayFromAsync(disco.trainByRound(["tabular", dataset])),
    );
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

    return disco.trainer.model.weights;
  }

  async function wikitextUser(): Promise<void> {
    const task = defaultTasks.wikitext.getTask();
    task.trainingInformation.epochs = 2;

    const dataset = loadText(
      path.join(DATASET_DIR, "wikitext", "wiki.train.tokens"),
    ).chain(loadText(path.join(DATASET_DIR, "wikitext", "wiki.valid.tokens")));

    const disco = await Disco.fromTask(task, url, { scheme: "federated" });

    const logs = List(
      await arrayFromAsync(disco.trainByRound(["text", dataset])),
    );
    await disco.close();

    expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
      logs.last()?.epochs.last()?.training.loss as number,
    );
  }

  async function lusCovidUser(): Promise<WeightsContainer> {
    const lusCovidTask = defaultTasks.lusCovid.getTask();
    lusCovidTask.trainingInformation.epochs = 16;
    lusCovidTask.trainingInformation.roundDuration = 4;

    const [positive, negative] = [
      (
        await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID+"))
      ).zip(Repeat("COVID-Positive")),
      (
        await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID-"))
      ).zip(Repeat("COVID-Negative")),
    ];
    const dataset = positive.chain(negative);

    const disco = await Disco.fromTask(lusCovidTask, url, {
      scheme: "federated",
    });

    const logs = List(
      await arrayFromAsync(disco.trainByRound(["image", dataset])),
    );
    await disco.close();

    const validationLogs = logs.last()?.epochs.last()?.validation;
    expect(validationLogs?.accuracy).to.be.greaterThan(0.6);

    return disco.trainer.model.weights;
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
