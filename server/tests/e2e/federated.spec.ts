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
  ModelCard,
} from "@epfml/discojs";
import { Disco, defaultTasks, defaultModels, GPT } from "@epfml/discojs";
import { List } from "immutable";
import {
  assert,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { Server } from "../../src/index.js";
import { datasets } from "../utils.js";
import { Participant, arrayFromAsync, expectWSToBeClose } from "./helpers.js";
import * as tf from "@tensorflow/tfjs-node";

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

    expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
      logs.last()?.epochs.last()?.training.loss as number,
    );

    const lastEpoch = logs.last()?.epochs.last();
    if (lastEpoch === undefined) throw new Error("no epoch ran");

    const finalWeights = disco.trainer.model.weights.clone();
    await disco.close();

    return [finalWeights, lastEpoch];
  }

  // Return tensor snapshot to check model weight reset
  const tensorMemorySnapshot = () => {
    const memory = tf.memory();

    return {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
    };
  };

  it("three cifar10 users reach consensus", { timeout: 200_000 }, async () => {
    const task = await defaultTasks.cifar10.getTask();
    const cifar10Task: Task<"image", "federated"> = {
      ...task,
      trainingInformation: {
        ...task.trainingInformation,
        privacy: undefined,
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        validationSplit: 0.5,
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
    const wikitextModelCard = {
      ...defaultModels.Wikitext,
      getModel: () =>
        Promise.resolve(
          new GPT({
            contextLength: task.trainingInformation.contextLength,
            maxIter: 10,
          }),
        ),
    };
    const url = await startServer(wikitextModelCard, taskProvider);
    const dataset = datasets.loadWikitext();

    const [r1, r2] = await Promise.all([
      runUser(url, task, dataset, false),
      runUser(url, task, dataset, false),
    ]);
    assert.isTrue(r1[0].equals(r2[0]));
  });

  /**
   * When disco.trainByRound is called for the first time, the client connects
   * to the server which returns the latest model, current round and nb of
   * participants. Then at each round the event cycle is:
   * a) onRoundBeginCommunication which updates the status to "local training"
   * b) local training (the status remains "local training")
   * c) onRoundEndCommunication which sends the local update and
   *    receives the global weights while emitting the status UPDATE
   *
   * Given this, it is important to note that a single call to
   * disco.trainByRound().next() performs a full round: a), b) and c).
   * It only resolves once the server aggregated the round, so when a client
   * is alone (minNbOfParticipants isn't met) the call stays pending until
   * another participant joins and the round completes. `Participant` therefore
   * splits a round in `startRound()` and `completeRound()`, so that the tests
   * can choreograph through the status and participants events instead of
   * awaiting a round right away.
   *
   * Every step of that choreography is a named function below asserting the
   * events it expects. Each test then plays the steps leading to the one it
   * covers and ends with that step, which keeps a failure pointing at a single
   * step of the timeline.
   */
  describe("clients emit expected events", { timeout: 100_000 }, () => {
    type Client = Participant<"image", "federated">;

    /** Statuses a client goes through during a round it can complete */
    const FULL_ROUND: readonly RoundStatus[] = [
      "local training",
      "updating model",
    ];

    let task: Task<"image", "federated">;
    let url: URL;
    let dataset: Dataset<DataFormat.Raw["image"]>;
    const joined: Client[] = [];

    beforeAll(async () => {
      dataset = await datasets.loadLusCOVID();
    });

    beforeEach(async () => {
      const baseTask = await defaultTasks.lusCovid.getTask();
      task = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          roundDuration: 1,
          minNbOfParticipants: 2,
        },
      };

      url = await startServer(defaultModels.LUSClassifier, {
        ...defaultTasks.lusCovid,
        getTask: () => Promise.resolve(task),
      });
    });

    afterEach(async () => {
      await Promise.all(joined.splice(0).map(async (c) => await c.leave()));
    });

    /** Have a new client join the task, closed at the end of the test */
    function join(name: string): Client {
      const client = new Participant(name, task, url, dataset);
      joined.push(client);
      return client;
    }

    /**
     * A client joining a task nobody else is on: it trains locally right away
     * but can't share its update, so it stays pending in c).
     */
    async function joinsAlone(name: string): Promise<Client> {
      const client = join(name).startRound();

      // a) and b), the client trains without waiting for anyone
      await client.expectStatuses("local training");
      await client.expectParticipants(1);
      // c), sharing the update needs a second participant
      await client.expectStatuses("not enough participants");

      return client;
    }

    /**
     * A client joining a waiting one: both share their update, the server
     * aggregates them and answers with the new global weights.
     */
    async function joinsWaitingClient(
      waiting: Client,
      name: string,
    ): Promise<Client> {
      const client = join(name).startRound();

      // the new client connects to the server, which triggers the participant
      // event, and trains
      await client.expectParticipants(2);
      await client.expectStatuses("local training");
      // the waiting client receives the EnoughParticipants message with the
      // participants, its previous status is restored and it shares its update
      await waiting.expectParticipants(2);
      await waiting.expectStatuses("local training", "updating model");
      // the new client finishes training and shares its update too
      await client.expectStatuses("updating model");

      // the server aggregates the round and answers with the new global
      // weights along with the participants, resolving both pending rounds
      await Promise.all([waiting.completeRound(), client.completeRound()]);
      await waiting.expectParticipants(2);
      await client.expectParticipants(2);

      return client;
    }

    /** A round during which every client is present, so a), b) and c) run */
    async function runFullRound(...clients: readonly Client[]): Promise<void> {
      await Promise.all(clients.map(async (c) => await c.completeRound()));

      for (const client of clients) await client.expectStatuses(...FULL_ROUND);
      // the server payload received during c) carries the participants
      for (const client of clients)
        await client.expectParticipants(clients.length);
    }

    /**
     * A client joining a session which already has enough participants. It
     * releases nobody and completes nobody's round, it only makes the others
     * one more: the server is the only one able to tell them.
     */
    async function joinsSession(
      present: readonly Client[],
      name: string,
    ): Promise<Client> {
      const client = join(name).startRound();

      const participants = present.length + 1;
      await client.expectParticipants(participants);
      await client.expectStatuses("local training");
      for (const other of present) await other.expectParticipants(participants);

      return client;
    }

    /**
     * A client leaving a session which keeps enough participants: the others
     * carry on, one fewer.
     */
    async function leavesSession(
      leaving: Client,
      remaining: readonly Client[],
    ): Promise<void> {
      await leaving.leave();

      for (const other of remaining)
        await other.expectParticipants(remaining.length);
    }

    /** A client leaving, the remaining one is left without enough participants */
    async function leavesTask(
      leaving: Client,
      remaining: Client,
    ): Promise<void> {
      await leaving.leave();

      // the remaining client receives the WaitingForMoreParticipants message
      await remaining.expectStatuses("not enough participants");
      await remaining.expectParticipants(1);
    }

    /** A client starting a round while it knows it is the only participant */
    async function startsRoundAlone(client: Client): Promise<void> {
      client.startRound();

      // it trains, then waits in c) for another participant
      await client.expectStatuses("local training", "not enough participants");
    }

    it("a client joining alone trains then waits for a participant", async () => {
      await joinsAlone("user 1");
    });

    it("a joining client completes the round of the waiting one", async () => {
      const user1 = await joinsAlone("user 1");

      await joinsWaitingClient(user1, "user 2");
    });

    it("a round runs the whole cycle when both clients are present", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingClient(user1, "user 2");

      await runFullRound(user1, user2);
    });

    it("a client is notified when a participant leaves", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingClient(user1, "user 2");

      await leavesTask(user1, user2);
    });

    it("a client left alone trains but waits to share its update", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingClient(user1, "user 2");
      await leavesTask(user1, user2);

      await startsRoundAlone(user2);
    });

    it("clients are notified when a participant joins", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingClient(user1, "user 2");

      // the minimum is already met so user 3 changes nothing but the count,
      // which the others would otherwise only learn when a round of theirs
      // completes, if one ever does
      await joinsSession([user1, user2], "user 3");
    });

    it("clients are notified when a participant leaves", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingClient(user1, "user 2");
      const user3 = await joinsSession([user1, user2], "user 3");

      // the remaining two still have enough participants to carry on
      await leavesSession(user3, [user1, user2]);
    });

    it("a client joining mid-training completes the pending round", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingClient(user1, "user 2");
      await leavesTask(user1, user2);
      await startsRoundAlone(user2);

      // the server should accept user 3's weights (they should not be
      // outdated) and aggregate them with user 2's pending round
      await joinsWaitingClient(user2, "user 3");
    });
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

  // Check memory difference between federated learning rounds
  it(
    "observes tensor memory across federated training rounds",
    { timeout: 200_000 },
    async () => {
      const baseTask = await defaultTasks.lusCovid.getTask();
      const task: Task<"image", "federated"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "federated",
          aggregationStrategy: "mean",
          epochs: 10,
          roundDuration: 1,
          minNbOfParticipants: 2,
        },
      };
      const lusCovidProvider = {
        getTask: () => Promise.resolve(task),
        modelCard: defaultModels.LUSClassifier,
      };

      const url = await startServer(
        defaultModels.LUSClassifier,
        lusCovidProvider,
      );

      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });

      try {
        const generators = [
          discoUser1.trainByRound(dataset),
          discoUser2.trainByRound(dataset),
        ];
        const warmupRounds = 2;
        const totalRounds = Math.trunc(
          task.trainingInformation.epochs /
            task.trainingInformation.roundDuration,
        );

        // Run warm up rounds before measuring memory so that model initialization happens
        // and does not measured as memory leakage
        for (let round = 0; round < warmupRounds; round++) {
          const results = await Promise.all(
            generators.map(async (generator) => await generator.next()),
          );

          results.forEach((result) => {
            expect(result.done, "training ended during warm-up").to.equal(
              false,
            );
          });
        }

        await new Promise((resolve) => setImmediate(resolve));

        // Measure the memory before running rounds
        const memoryBeforeMeasuredRounds = tensorMemorySnapshot();
        const measuredRoundSnapshots: ReturnType<
          typeof tensorMemorySnapshot
        >[] = [];
        const numberOfMeasuredRounds = totalRounds - warmupRounds;

        // Record tensor memory after each round
        // Pass condition is that memory should be disposed properly, and should not grow each round
        for (let round = 0; round < numberOfMeasuredRounds; round++) {
          const results = await Promise.all(
            generators.map(async (generator) => await generator.next()),
          );

          results.forEach((result) => {
            expect(
              result.done,
              `training ended during measured round ${round + 1}`,
            ).to.equal(false);
          });

          // Finish the pending asynchronous work, and store the memory measurement for this round
          await new Promise((resolve) => setImmediate(resolve));
          measuredRoundSnapshots.push(tensorMemorySnapshot());
        }

        // Check if two users' models converge
        await expectWSToBeClose(
          discoUser1.trainer.model.weights,
          discoUser2.trainer.model.weights,
        );

        expect(measuredRoundSnapshots).to.have.lengthOf(numberOfMeasuredRounds);

        // Check the allocated tensors did not increase between rounds
        for (let index = 1; index < measuredRoundSnapshots.length; index++) {
          const previousSnapshot = measuredRoundSnapshots[index - 1];
          const currentSnapshot = measuredRoundSnapshots[index];

          expect(currentSnapshot.numTensors).to.be.at.most(
            previousSnapshot.numTensors,
          );
          expect(currentSnapshot.numBytes).to.be.at.most(
            previousSnapshot.numBytes,
          );
        }

        // Get the final memory state
        const finalSnapshot = measuredRoundSnapshots.at(-1);

        if (finalSnapshot === undefined) {
          throw new Error("No tensor memory snapshot was recorded");
        }

        // Check if the final memory state did not grow from the initial state
        // measured after the warm up
        expect(finalSnapshot.numTensors).to.be.at.most(
          memoryBeforeMeasuredRounds.numTensors,
        );
        expect(finalSnapshot.numBytes).to.be.at.most(
          memoryBeforeMeasuredRounds.numBytes,
        );
      } finally {
        await Promise.all([
          discoUser1.close().catch(() => {}),
          discoUser2.close().catch(() => {}),
        ]);
      }
    },
  );

  // Check if memory is cleaned after clients close
  it(
    "releases federated client tensors when clients close",
    { timeout: 200_000 },
    async () => {
      const baseTask = await defaultTasks.lusCovid.getTask();
      const task: Task<"image", "federated"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "federated",
          aggregationStrategy: "mean",
          epochs: 1,
          roundDuration: 1,
          minNbOfParticipants: 2,
        },
      };
      const lusCovidProvider = {
        getTask: () => Promise.resolve(task),
        modelCard: defaultModels.LUSClassifier,
      };

      const url = await startServer(
        defaultModels.LUSClassifier,
        lusCovidProvider,
      );
      const dataset = await datasets.loadLusCOVID();

      // The server and dataset are initialized, but client models are not loaded
      // Used for comparison with memory after closing clients
      const memoryBeforeClients = tensorMemorySnapshot();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const generators = [
        discoUser1.trainByRound(dataset),
        discoUser2.trainByRound(dataset),
      ];
      let clientsClosed = false;

      try {
        // Run one decentalized round so clients allocate the model
        // and establish communication state with other peers
        const completedRounds = await Promise.all(
          generators.map(async (generator) => await generator.next()),
        );
        completedRounds.forEach((result) => {
          expect(
            result.done,
            "expected a completed federated training round",
          ).to.equal(false);
        });

        // Close the clients, this should dispose tensors owned by them
        await Promise.all([discoUser1.close(), discoUser2.close()]);
        clientsClosed = true;

        // After closing the clients, the memory state should return to the
        // memory before clients are created
        const memoryAfterClose = tensorMemorySnapshot();
        expect(memoryAfterClose.numTensors).to.be.at.most(
          memoryBeforeClients.numTensors,
        );
        expect(memoryAfterClose.numBytes).to.be.at.most(
          memoryBeforeClients.numBytes,
        );
      } finally {
        await Promise.allSettled(
          generators.map(
            async (generator) => await generator.return(undefined),
          ),
        );
        if (!clientsClosed) {
          await Promise.allSettled([discoUser1.close(), discoUser2.close()]);
        }
      }
    },
  );
});
