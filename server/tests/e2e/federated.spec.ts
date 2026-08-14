import type * as http from "node:http";
import type {
  DataFormat,
  DataType,
  Dataset,
  EpochLogs,
  RoundStatus,
  Task,
  TaskProvider,
  WeightsContainer,
} from "@epfml/discojs";
import { Disco, defaultTasks, defaultModels, ModelCard } from "@epfml/discojs";
import { List } from "immutable";
import { assert, afterEach, describe, expect, it } from "vitest";
import { Server } from "../../src/index.js";
import { Queue, datasets } from "../utils.js";

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
  let handle: http.Server | undefined;
  async function startServer(
    model: ModelCard<DataType>,
    task: TaskProvider<DataType, "federated">,
  ): Promise<URL> {
    const server = await Server.with([model], [task]);

    let url: URL;
    [handle, url] = await server.serve();
    return url;
  }
  afterEach(
    () =>
      new Promise<void>((resolve, reject) =>
        handle?.close((e) => {
          if (e !== undefined) reject(e);
          else resolve();
          handle = undefined;
        }),
      ),
  );

  async function runUser<D extends DataType>(
    url: URL,
    task: Task<D, "federated">,
    dataset: Dataset<DataFormat.Raw[D]>,
    preprocessOnce = true,
  ): Promise<[WeightsContainer, EpochLogs]> {
    const disco = new Disco(task, url, { preprocessOnce });

    const logs = List(await arrayFromAsync(disco.trainByRound(dataset)));
    await disco.close();

    expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
      logs.last()?.epochs.last()?.training.loss as number,
    );

    const lastEpoch = logs.last()?.epochs.last();
    if (lastEpoch === undefined) throw new Error("no epoch ran");
    return [disco.trainer.model.weights, lastEpoch];
  }

  it("three cifar10 users reach consensus", { timeout: 200_000 }, async () => {
    const task = await defaultTasks.cifar10.getTask();
    const cifar10Task: Task<"image", "federated"> = {
      ...task,
      trainingInformation: {
        ...task.trainingInformation,
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
      },
    };
    const cifar10TaskProvider = {
      getTask: () => Promise.resolve(cifar10Task),
      modelCard: defaultModels.CIFAR10Classifier,
    };
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      cifar10TaskProvider,
    );
    const dataset = await datasets.loadCifar10();

    const [[m1, l1], [m2, l2], [m3, l3]] = await Promise.all([
      runUser(url, cifar10Task, dataset),
      runUser(url, cifar10Task, dataset),
      runUser(url, cifar10Task, dataset),
    ]);

    for (const lastEpoch of [l1, l2, l3]) {
      expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
      expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
    }
    assert.isTrue(m1.equals(m2) && m2.equals(m3));
  });

  it("two titanic users reach consensus", { timeout: 50_000 }, async () => {
    const task = await defaultTasks.titanic.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.titanic,
      getTask: () => Promise.resolve(task),
    };
    const url = await startServer(
      defaultModels.TitanicClassifier,
      taskProvider,
    );
    const dataset = datasets.loadTitanic();

    const [[m1, l1], [m2, l2]] = await Promise.all([
      runUser(url, task, dataset),
      runUser(url, task, dataset),
    ]);

    for (const lastEpoch of [l1, l2]) {
      expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
      expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
    }
    assert.isTrue(m1.equals(m2));
  });

  it("two lus_covid users reach consensus", { timeout: 200_000 }, async () => {
    const task = await defaultTasks.lusCovid.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      epochs: 16,
      roundDuration: 2,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    };
    const url = await startServer(defaultModels.LUSClassifier, taskProvider);
    const dataset = await datasets.loadLusCOVID();

    const [[m1, l1], [m2, l2]] = await Promise.all([
      runUser(url, task, dataset),
      runUser(url, task, dataset),
    ]);

    for (const lastEpoch of [l1, l2]) {
      expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
      expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
    }
    assert.isTrue(m1.equals(m2));
  });

  it("two wikitext reach consensus", { timeout: 500_000 }, async () => {
    const task = await defaultTasks.wikitext.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      epochs: 2,
      roundDuration: 2,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.wikitext,
      getTask: () => Promise.resolve(task),
    };
    const url = await startServer(defaultModels.Wikitext, taskProvider);
    const dataset = datasets.loadWikitext();

    const [r1, r2] = await Promise.all([
      runUser(url, task, dataset, false),
      runUser(url, task, dataset, false),
    ]);
    assert.isTrue(r1[0].equals(r2[0]));
  });

  it("clients emit expected events", { timeout: 100_000 }, async () => {
    const task = await defaultTasks.lusCovid.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      roundDuration: 1,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    };
    const url = await startServer(defaultModels.LUSClassifier, taskProvider);
    const dataset = await datasets.loadLusCOVID();

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

    // Create User 1
    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const statusUser1 = new Queue<RoundStatus>();
    const nbParticipantsUser1 = new Queue<number>();
    discoUser1.on("status", (status) => statusUser1.put(status));
    discoUser1.on("participants", (participants) =>
      nbParticipantsUser1.put(participants),
    );
    const generatorUser1 = discoUser1.trainByRound(dataset);

    // Have User 1 join the task and train locally for one round
    await generatorUser1.next();
    expect(await statusUser1.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(1);

    // Calling next() a 2nd time makes User 1 go to c) where the client should
    // stay stuck awaiting until another participant joins
    const logUser1Round2Promise = generatorUser1.next();
    expect(await statusUser1.next()).equal("not enough participants");

    // Create User 2
    const discoUser2 = new Disco(task, url, { preprocessOnce: true });
    const statusUser2 = new Queue<RoundStatus>();
    const nbParticipantsUser2 = new Queue<number>();
    discoUser2.on("status", (status) => statusUser2.put(status));
    discoUser2.on("participants", (participants) =>
      nbParticipantsUser2.put(participants),
    );
    const generatorUser2 = discoUser2.trainByRound(dataset);

    // Have User 2 join the task and train for one round
    await generatorUser2.next();
    // User 2 did a) and b)
    expect(await statusUser1.next()).equal("local training");
    expect(await statusUser2.next()).equal("local training");
    // User 1 is still in c) now waiting for user 2 to share their local update
    // and for the server to aggregate the local updates
    expect(await statusUser1.next()).equal("updating model");
    // User 2 connects to the server which triggers the participant event
    expect(await nbParticipantsUser2.next()).equal(2);
    // Receive the EnoughParticipants message with the participants
    expect(await nbParticipantsUser1.next()).equal(2);

    // Proceed with round 2

    // the server should answer with the new global weights
    // and users should train locally on the new weights
    await Promise.all([logUser1Round2Promise, generatorUser2.next()]);
    // User 1 and 2 did c), a) and b)
    expect(await statusUser2.next()).equal("updating model");
    expect(await statusUser1.next()).equal("local training");
    expect(await statusUser2.next()).equal("local training");
    // Receive the server payload during c) along with the participants
    expect(await nbParticipantsUser2.next()).equal(2);
    expect(await nbParticipantsUser1.next()).equal(2);

    // Make user 2 go to c)
    const logUser2Round3Promise = generatorUser2.next();
    expect(await statusUser2.next()).equal("updating model");

    // Have user 1 quit the session
    await discoUser1.close();
    // User 2 receives the WaitingForMoreParticipants message
    expect(await statusUser2.next()).equal("not enough participants");
    expect(await nbParticipantsUser2.next()).equal(1);

    // Create User 3
    const discoUser3 = new Disco(task, url, { preprocessOnce: true });
    const statusUser3 = new Queue<RoundStatus>();
    const nbParticipantsUser3 = new Queue<number>();
    discoUser3.on("status", (status) => statusUser3.put(status));
    discoUser3.on("participants", (participants) =>
      nbParticipantsUser3.put(participants),
    );
    const generatorUser3 = discoUser3.trainByRound(dataset);

    // User 3 joins mid-training and trains one local round
    await generatorUser3.next();
    expect(await statusUser3.next()).equal("local training");
    expect(await nbParticipantsUser3.next()).equal(2);

    // User 2 is still in c) waiting for user 3 to share their local update
    // and for the server to aggregate the local updates
    expect(await statusUser2.next()).equal("updating model");
    // User 2 receives the EnoughParticipants message
    expect(await nbParticipantsUser2.next()).equal(2);

    // User 3 sends their weights to the server
    await Promise.all([logUser2Round3Promise, generatorUser3.next()]);
    expect(await statusUser3.next()).equal("updating model");

    // the server should accept user 3's weights (should not be outdated) and aggregate the global weights
    // both user 2 and 3 did c), a) and are now in b)
    expect(await statusUser2.next()).equal("local training");
    expect(await statusUser3.next()).equal("local training");
    // User 2 and 3 finish c)
    expect(await nbParticipantsUser3.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);

    await discoUser2.close();
    expect(await statusUser3.next()).equal("not enough participants");
    // WaitForMoreParticipants message
    expect(await nbParticipantsUser3.next()).equal(1);

    await discoUser3.close();
  });

  /**
   * Test if federated learning task lus_covid operates correctly with differential privacy
   */
  it(
    "three lus_covid clients meet consensus with differential privacy",
    { timeout: 1_000_000 },
    async () => {
      const task = await defaultTasks.lusCovid.getTask();
      task.trainingInformation = {
        ...task.trainingInformation,
        epochs: 20,
        roundDuration: 10,
        minNbOfParticipants: 3,
        aggregationStrategy: "mean",
        privacy: {
          differentialPrivacy: {
            epsilon: 50,
            delta: 1e-5,
            clippingRadius: 10,
          },
        },
      };
      const taskProvider = {
        ...defaultTasks.lusCovid,
        getTask: () => Promise.resolve(task),
      };
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
      const dataset = await datasets.loadLusCOVID();

      const [[m1, l1], [m2, l2], [m3, l3]] = await Promise.all([
        runUser(url, task, dataset),
        runUser(url, task, dataset),
        runUser(url, task, dataset),
      ]);

      for (const lastEpoch of [l1, l2, l3]) {
        expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
        expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
      }
      assert.isTrue(m1.equals(m2) && m2.equals(m3));
    },
  );
});
