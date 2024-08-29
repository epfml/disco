import { assert, expect } from "chai";
import { List, Repeat } from "immutable";
import type * as http from "node:http";
import path from "node:path";

import type { RoundStatus, WeightsContainer } from "@epfml/discojs";
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

    const disco = new Disco(defaultTasks.cifar10.getTask(), url, {
      scheme: "federated"
    })
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
    const disco = new Disco(titanicTask, url, {
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

  async function wikitextUser(): Promise<WeightsContainer> {
    const task = defaultTasks.wikitext.getTask();
    task.trainingInformation.epochs = 2;

    const dataset = loadText(
      path.join(DATASET_DIR, "wikitext", "wiki.train.tokens"),
    ).chain(loadText(path.join(DATASET_DIR, "wikitext", "wiki.valid.tokens")));

    const disco = new Disco(task, url, { scheme: "federated" });

    const logs = List(
      await arrayFromAsync(disco.trainByRound(["text", dataset])),
    );
    await disco.close();

    expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
      logs.last()?.epochs.last()?.training.loss as number,
    );
    return disco.trainer.model.weights
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

    const disco = new Disco(lusCovidTask, url, {
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
    this.timeout(5_000);

    const [m1, m2] = await Promise.all([titanicUser(), titanicUser()]);
    assert.isTrue(m1.equals(m2));
  });
  it("two lus_covid users reach consensus", async function () {
    this.timeout("3m");

    const [m1, m2] = await Promise.all([lusCovidUser(), lusCovidUser()]);
    assert.isTrue(m1.equals(m2));
  });
  
  it("two wikitext reach consensus", async function () {
    this.timeout("3m");
    
    const [m1, m2] = await Promise.all([wikitextUser(), wikitextUser()]);
    assert.isTrue(m1.equals(m2))
  });

  it("clients emit expected statuses", async function () {
    this.timeout(10_000);
    const lusCovidTask = defaultTasks.lusCovid.getTask();
    lusCovidTask.trainingInformation.epochs = 8;
    lusCovidTask.trainingInformation.roundDuration = 2;
    lusCovidTask.trainingInformation.minNbOfParticipants = 2;

    const [positive, negative] = [
      (
        await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID+"))
      ).zip(Repeat("COVID-Positive")),
      (
        await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID-"))
      ).zip(Repeat("COVID-Negative")),
    ];
    const dataset = positive.chain(negative);

    /**
     * The timeline of expected of events is:
     * - User 1 joins the task by themselves
     * - User 2 joins
     * - User 1 leaves
     * - User 3 joins
     * - User 2 & 3 leave
     */
    const TRAINING: RoundStatus = "Training the model on the data you connected"
    const WAITING: RoundStatus = "Waiting for more participants"
    const UPDATING: RoundStatus = "Updating the model with other participants' models"

    // Create User 1
    const discoUser1 = new Disco(lusCovidTask, url, {
      scheme: "federated",
    });
    let statusUser1: RoundStatus | undefined;
    discoUser1.on("status", status => {
      statusUser1 = status
      console.log("User 1 status is", status)
    })
    const generatorUser1 = discoUser1.trainByRound(["image", dataset])
    
    // Have User 1 join the task and train for one round
    const logUser1Round1 = await generatorUser1.next()
    if (logUser1Round1.done) throw Error("User 1 finished training at their 1st round")
    
    expect(logUser1Round1.value.participants).equal(1)
    expect(statusUser1).equal(TRAINING)

    // User 1 should wait for one more participant before yielding the next round
    const logUser1Round2Promise = generatorUser1.next()
    await new Promise((res,_) => setTimeout(res, 500)) // Wait some time for the status to update
    expect(statusUser1).equal("Waiting for more participants")

    // Create User 2
    const discoUser2 = new Disco(lusCovidTask, url, {
      scheme: "federated",
    });
    let statusUser2: RoundStatus | undefined;
    discoUser2.on("status", status => {
      statusUser2 = status
      console.log("User 2 status is", status)
    })
    const generatorUser2 = discoUser2.trainByRound(["image", dataset])

    // Have User 2 join the task and train for one round
    const logUser2Round1 = await generatorUser2.next()
    if (logUser2Round1.done) throw Error("User 2 finished training at their 1st round")
    // Participants are only updated after the first communication round
    // User 2 didn't communicate yet so the participant number is still 1
    expect(logUser2Round1.value.participants).equal(1)
    expect(statusUser2).equal(TRAINING)
    // User 1 is waiting for user 2 to share their local update
    // and for the server to aggregate the local updates
    expect(statusUser1).equal(UPDATING)

    // Proceed with round 2
    // the server should answer with the new global weights
    // and users should train locally on the new weights
    const logUser2Round2 = await generatorUser2.next()
    const logUser1Round2 = await logUser1Round2Promise // the promise can resolve now
    if (logUser2Round2.done || logUser1Round2.done)
      throw Error("User 1 or 2 finished training at the 2nd round")
    expect(logUser1Round2.value.participants).equal(2)
    expect(logUser2Round2.value.participants).equal(2)
    expect(statusUser1).equal(TRAINING)
    expect(statusUser2).equal(TRAINING)
    
    // Have user 1 quit the session
    await discoUser1.close()
    const logUser2Round3Promise = generatorUser2.next()
    await new Promise((res, _) => setTimeout(res, 500)) // Wait some time for the status to update
    expect(statusUser2).equal(WAITING)

    // Create User 3
    const discoUser3 = new Disco(lusCovidTask, url, {
      scheme: "federated",
    });
    let statusUser3: RoundStatus | undefined;
    discoUser3.on("status", status => {
      statusUser3 = status
      console.log("User 3 status is", status)
    })
    const generatorUser3 = discoUser3.trainByRound(["image", dataset])

    // User 3 joins and trains for their 1st round
    // The server should answer with the latest global weights
    const logUser3Round1 = await generatorUser3.next()
    if (logUser3Round1.done) throw Error("User 3 finished training at their 1st round")
      // User 3 didn't communicate their weights with the server yet
    // so they didn't get the current number of participants
    expect(logUser3Round1.value.participants).equal(1)
    expect(statusUser3).equal(TRAINING)
    // User 2 is waiting for user 3 to share their local update
    // and for the server to aggregate the local updates
    expect(statusUser2).equal(UPDATING)
    
    // User 3 sends their weights to the server
    const logUser3Round3 = await generatorUser3.next()
    // the server should accept user 3's weights and aggregate the global weights
    const logUser2Round3 = await logUser2Round3Promise // the promise can resolve now
    if (logUser3Round3.done || logUser2Round3.done) throw Error("User 1 or 2 finished training at the 3nd round")
    expect(logUser2Round3.value.participants).equal(2)
    expect(logUser3Round3.value.participants).equal(2)
    expect(statusUser2).equal(TRAINING)
    expect(statusUser3).equal(TRAINING)
    
    await discoUser2.close()
    await new Promise((res, _) => setTimeout(res, 500)) // Wait some time for the status to update
    expect(statusUser3).equal(WAITING)
    await discoUser3.close()
  });
});
