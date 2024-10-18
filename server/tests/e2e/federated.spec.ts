import { assert, expect } from "chai";
import { List, Repeat } from "immutable";
import type * as http from "node:http";
import path from "node:path";

import type { RoundLogs, RoundStatus, WeightsContainer } from "@epfml/discojs";
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
  afterEach(
    () =>
      new Promise<void>((resolve, reject) =>
        server?.close((e) => {
          if (e !== undefined) reject(e);
          else resolve();
        }),
      ),
  );

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

  it("three cifar10 users reach consensus", async () => {
    [server, url] = await new Server().serve(
      undefined,
      defaultTasks.cifar10,
    );

    const [m1, m2, m3] = await Promise.all([
      cifar10user(),
      cifar10user(),
      cifar10user(),
    ]);

    assert.isTrue(m1.equals(m2) && m2.equals(m3));
  }).timeout("2m");

  it("two titanic users reach consensus", async () => {
    [server, url] = await new Server().serve(
      undefined,
      defaultTasks.titanic,
    );

    const [m1, m2] = await Promise.all([titanicUser(), titanicUser()]);
    assert.isTrue(m1.equals(m2));
  }).timeout("10s");

  it("two lus_covid users reach consensus", async () => {
    [server, url] = await new Server().serve(
      undefined,
      defaultTasks.lusCovid,
    );

    const [m1, m2] = await Promise.all([lusCovidUser(), lusCovidUser()]);
    assert.isTrue(m1.equals(m2));
  }).timeout("1m");
  
  it("two wikitext reach consensus", async () => {
    [server, url] = await new Server().serve(
      undefined,
      defaultTasks.wikitext,
    );
    
    const [m1, m2] = await Promise.all([wikitextUser(), wikitextUser()]);
    assert.isTrue(m1.equals(m2))
  }).timeout("3m");

  it("clients emit expected statuses", async () => {
    [server, url] = await new Server().serve(
      undefined,
      defaultTasks.lusCovid,
    );

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
     * When disco.trainByRound is called for the first time, the client connects to the server
     * which returns the latest model, current round and nb of participants.
     * Then at each round the event cycle is:
     * a) onRoundBeingCommunication which updates the status to "local training"
     * b) local training (the status remains "local training")
     * c) onRoundEndCommunication which sends the local update and 
     * receives the global weights while emitting the status UPDATE
     * 
     * Given this, it is important to note that calling disco.trainByRound().next()
     * for the first time will perform a) and then b) where it stops and yields the round logs.
     * Thus, c) isn't done and the model aggregation by the server is not performed during this first call to next().
     * 
     * Calling next() again will then do c), and back to a) and b).
     * 
     * In this test the timeline is:
     * - User 1 joins the task by themselves
     * - User 2 joins
     * - User 1 leaves
     * - User 3 joins
     * - User 2 & 3 leave
     */
    const statusUpdateTime = 500

    // Create User 1
    const discoUser1 = new Disco(lusCovidTask, url, { scheme: "federated" });
    let statusUser1: RoundStatus | undefined;
    discoUser1.on("status", status => { statusUser1 = status })
    const generatorUser1 = discoUser1.trainByRound(["image", dataset])
    
    // Have User 1 join the task and train locally for one round
    const logUser1Round1 = await generatorUser1.next()
    expect(logUser1Round1.done).to.be.false
    // User 1 did a) and b) so their status should be Training
    expect((logUser1Round1.value as RoundLogs).participants).equal(1)

    // Calling next() a 2nd time makes User 1 go to c) where the client should
    // stay stuck awaiting until another participant joins
    const logUser1Round2Promise = generatorUser1.next()
    await new Promise((res,_) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    expect(statusUser1).equal("not enough participants")

    // Create User 2
    const discoUser2 = new Disco(lusCovidTask, url, { scheme: "federated" });
    let statusUser2: RoundStatus | undefined;
    discoUser2.on("status", status => { statusUser2 = status })
    const generatorUser2 = discoUser2.trainByRound(["image", dataset])

    // Have User 2 join the task and train for one round
    const logUser2Round1 = await generatorUser2.next()
    expect(logUser2Round1.done).to.be.false
    expect((logUser2Round1.value as RoundLogs).participants).equal(2)
    // User 2 did a) and b)
    expect(statusUser2).equal("local training")
    // User 1 is still in c) now waiting for user 2 to share their local update
    // and for the server to aggregate the local updates
    expect(statusUser1).equal("updating model")

    // Proceed with round 2
    // the server should answer with the new global weights
    // and users should train locally on the new weights
    const logUser2Round2 = await generatorUser2.next()
    const logUser1Round2 = await logUser1Round2Promise // the promise can resolve now
    expect(logUser1Round2.done).to.be.false
    expect(logUser2Round2.done).to.be.false
    expect((logUser1Round2.value as RoundLogs).participants).equal(2)
    expect((logUser2Round2.value as RoundLogs).participants).equal(2)
    // User 1 and 2 did c), a) and b)
    expect(statusUser1).equal("local training")
    expect(statusUser2).equal("local training")
    
    // Have user 1 quit the session
    await discoUser1.close()
    // Make user 2 go to c)
    const logUser2Round3Promise = generatorUser2.next()
    await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    expect(statusUser2).equal("not enough participants")

    // Create User 3
    const discoUser3 = new Disco(lusCovidTask, url, { scheme: "federated" });
    let statusUser3: RoundStatus | undefined;
    discoUser3.on("status", status => { statusUser3 = status })
    const generatorUser3 = discoUser3.trainByRound(["image", dataset])

    // User 3 joins mid-training and trains one local round
    const logUser3Round1 = await generatorUser3.next()
    expect(logUser3Round1.done).to.be.false
    expect((logUser3Round1.value as RoundLogs).participants).equal(2)
    // User 3 did a) and b)
    expect(statusUser3).equal("local training")
    // User 2 is still in c) waiting for user 3 to share their local update
    // and for the server to aggregate the local updates
    expect(statusUser2).equal("updating model")
    
    // User 3 sends their weights to the server
    const logUser3Round3 = await generatorUser3.next()
    // the server should accept user 3's weights (should not be outdated) and aggregate the global weights
    const logUser2Round3 = await logUser2Round3Promise // the promise can resolve now
    if (logUser3Round3.done || logUser2Round3.done)
      throw Error("User 1 or 2 finished training at the 3nd round")
    expect(logUser2Round3.value.participants).equal(2)
    expect(logUser3Round3.value.participants).equal(2)
    // both user 2 and 3 did c), a) and are now in b)
    expect(statusUser2).equal("local training")
    expect(statusUser3).equal("local training")
    
    await discoUser2.close()
    await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    expect(statusUser3).equal("not enough participants")
    await discoUser3.close()
  }).timeout("30s");
});
