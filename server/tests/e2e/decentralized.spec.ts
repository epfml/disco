import type * as http from "node:http";
import type {
  DataFormat,
  DataType,
  Dataset,
  RoundStatus,
  Client,
  Task,
  TaskProvider,
  ModelCard,
  EpochLogs,
} from "@epfml/discojs";
import {
  MeanAggregator,
  SecureAggregator,
  DecentralizedClient,
  Disco,
  defaultTasks,
  defaultModels,
  WeightsContainer,
} from "@epfml/discojs";
import { List } from "immutable";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Server } from "../../src/index.js";
import { datasets } from "../utils.js";
import {
  Participant,
  arrayFromAsync,
  expectAllWSToBeClose,
  expectPeersToAgreeOnModel,
  expectWSToBeClose,
  recordModelsAtRoundBoundary,
} from "./helpers.js";
import * as tf from "@tensorflow/tfjs-node";

const expectWeightsToEqual = (a: WeightsContainer, b: WeightsContainer) => {
  expect(a.weights.length).to.equal(b.weights.length);

  a.weights.forEach((w, i) => {
    expect(Array.from(w.dataSync())).to.deep.equal(
      Array.from(b.weights[i].dataSync()),
    );
  });
};

describe("end-to-end decentralized", { timeout: 50_000 }, () => {
  let handle: http.Server | undefined;
  async function startServer(
    model: ModelCard<DataType>,
    task: TaskProvider<DataType, "decentralized">,
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

  /**
   * Makes client object to connect to server. The input array is the weights that the client will share
   * with other ready peers. The input will vary with model architecture and training data. If secure is true,
   * the client will implement secure aggregation. If it is false, it will be a clear text client.
   */
  async function simulateClient(
    url: URL,
    aggregatorType: "mean" | "secure",
    input: number[],
    rounds: number,
  ): Promise<[WeightsContainer, Client<"decentralized">]> {
    const task = await defaultTasks.cifar10.getTask();
    const aggregator =
      aggregatorType === "mean"
        ? new MeanAggregator(0, 1, "relative")
        : new SecureAggregator();

    const client = new DecentralizedClient(url, task, aggregator);
    await client.connect();

    // Perform multiple training rounds
    let weights = WeightsContainer.of(input);
    for (let r = 0; r < rounds; r++) {
      await client.onRoundBeginCommunication();
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      weights = await client.onRoundEndCommunication(weights);
    }

    return [weights, client];
  }

  /**
   * Creates three clients with different update values and returns the aggregated update value between all three clients.
   * The clients have model dimension of 4 model updates to share, which can be seen as their input parameter in makeClient.
   */
  async function reachConsensus(
    url: URL,
    aggregatorType: "mean" | "secure",
    rounds = 1,
  ): Promise<void> {
    // Expect the clients to reach the mean consensus, for both the mean and secure aggregators
    const contributions = List.of(
      [0.001, 3, 40, 10],
      [0.002, 5, 30, 11],
      [0.003, 13, 11, 12],
    );
    const actual = await Promise.all(
      contributions
        .map(async (w) => await simulateClient(url, aggregatorType, w, rounds))
        .toArray(),
    );
    const consensuses = await Promise.all(
      actual.map(async ([consensus, client]) => {
        // Disconnect clients once they reached consensus
        await client.disconnect();
        return consensus;
      }),
    );

    const consensus = consensuses[0];
    await Promise.all(
      consensuses.map(
        async (current) => await expectWSToBeClose(consensus, current),
      ),
    );
  }

  // For task reset testing
  const weightTensorShapes = (weights: WeightsContainer): number[][] =>
    weights.weights.map((w) => [...w.shape]);

  // Return tensor length to check model weight tensor reset
  const modelTensorCount = (weights: WeightsContainer): number =>
    weights.weights.length;

  // Return tensor snapshot to check model weight reset
  const tensorMemorySnapshot = () => {
    const memory = tf.memory();

    return {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
    };
  };

  it("single round of cifar 10 with three mean aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachConsensus(url, "mean");
  });

  it("several rounds of cifar 10 with three mean aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachConsensus(url, "mean", 3);
  });

  it("single round of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachConsensus(url, "secure");
  });

  it("several rounds of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachConsensus(url, "secure", 3);
  });

  /**
   * Unit tests with 10 participants
   */
  // Mean aggregator
  it(
    "ten cifar10 users reach consensus with mean aggregation",
    { timeout: 300_000 },
    async () => {
      const baseTask = await defaultTasks.cifar10.getTask();
      const task: Task<"image", "decentralized"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "decentralized",
          aggregationStrategy: "mean",
          epochs: 3,
          roundDuration: 1,
          minNbOfParticipants: 10,
        },
      };

      const url = await startServer(defaultModels.CIFAR10Classifier, {
        ...defaultTasks.cifar10,
        getTask: () => Promise.resolve(task),
      });
      const dataset = await datasets.loadCifar10();

      const discos = Array.from(
        { length: 10 },
        () => new Disco(task, url, { preprocessOnce: true }),
      );

      try {
        const results = await Promise.all(
          discos.map(async (disco) => {
            const logs = List(
              await arrayFromAsync(disco.trainByRound(dataset)),
            );
            const lastEpoch = logs.last()?.epochs.last();
            if (lastEpoch === undefined) throw new Error("no epoch ran");

            return [disco.trainer.model.weights, lastEpoch] as [
              WeightsContainer,
              EpochLogs,
            ];
          }),
        );

        await expectAllWSToBeClose(...results.map(([weights]) => weights));
      } finally {
        await Promise.all(discos.map((disco) => disco.close()));
      }
    },
  );

  // Byzantine aggregator
  it(
    "ten cifar10 users reach consensus with byzantine aggregation",
    { timeout: 300_000 },
    async () => {
      const baseTask = await defaultTasks.cifar10.getTask();
      const task: Task<"image", "decentralized"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "decentralized",
          aggregationStrategy: "byzantine",
          epochs: 3,
          roundDuration: 1,
          minNbOfParticipants: 10,
          privacy: {
            byzantineFaultTolerance: {
              clippingRadius: 10,
              maxIterations: 1,
              beta: 0.9,
            },
          },
        },
      };

      const url = await startServer(defaultModels.CIFAR10Classifier, {
        ...defaultTasks.cifar10,
        getTask: () => Promise.resolve(task),
      });
      const dataset = await datasets.loadCifar10();

      const discos = Array.from(
        { length: 10 },
        () => new Disco(task, url, { preprocessOnce: true }),
      );

      try {
        const results = await Promise.all(
          discos.map(async (disco) => {
            const logs = List(
              await arrayFromAsync(disco.trainByRound(dataset)),
            );
            const lastEpoch = logs.last()?.epochs.last();
            if (lastEpoch === undefined) throw new Error("no epoch ran");

            return [disco.trainer.model.weights, lastEpoch] as [
              WeightsContainer,
              EpochLogs,
            ];
          }),
        );

        await expectAllWSToBeClose(...results.map(([weights]) => weights));
      } finally {
        await Promise.all(discos.map((disco) => disco.close()));
      }
    },
  );

  // Secure aggregator
  it(
    "ten cifar10 users reach consensus with secure aggregation",
    { timeout: 500_000 },
    async () => {
      const baseTask = await defaultTasks.cifar10.getTask();
      const task: Task<"image", "decentralized"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "decentralized",
          aggregationStrategy: "secure",
          epochs: 10,
          roundDuration: 1,
          minNbOfParticipants: 10,
          maxShareValue: 100,
        },
      };

      const url = await startServer(defaultModels.CIFAR10Classifier, {
        ...defaultTasks.cifar10,
        getTask: () => Promise.resolve(task),
      });
      const dataset = await datasets.loadCifar10();

      const discos = Array.from(
        { length: 10 },
        () => new Disco(task, url, { preprocessOnce: true }),
      );

      try {
        const results = await Promise.all(
          discos.map(async (disco) => {
            const logs = List(
              await arrayFromAsync(disco.trainByRound(dataset)),
            );
            const lastEpoch = logs.last()?.epochs.last();
            if (lastEpoch === undefined) throw new Error("no epoch ran");

            return [disco.trainer.model.weights, lastEpoch] as [
              WeightsContainer,
              EpochLogs,
            ];
          }),
        );

        await expectAllWSToBeClose(...results.map(([weights]) => weights));
      } finally {
        await Promise.all(discos.map((disco) => disco.close()));
      }
    },
  );

  /** The LUS COVID task, decentralized between at least two participants */
  async function lusCovidDecentralized(
    trainingInformationOverrides: { epochs?: number } = {},
  ): Promise<{
    task: Task<"image", "decentralized">;
    taskProvider: TaskProvider<"image", "decentralized">;
  }> {
    const baseTask = await defaultTasks.lusCovid.getTask();
    const task: Task<"image", "decentralized"> = {
      ...baseTask,
      trainingInformation: {
        ...baseTask.trainingInformation,
        scheme: "decentralized",
        aggregationStrategy: "mean",
        roundDuration: 1,
        minNbOfParticipants: 2,
        maxConnectionRetry: 3,
        maxPeerConnectionTime: 60_000,
        maxModelSyncTime: 30_000,
        ...trainingInformationOverrides,
      },
    };
    return {
      task,
      taskProvider: {
        ...defaultTasks.lusCovid,
        getTask: () => Promise.resolve(task),
      },
    };
  }

  /**
   * At each round (each call to `disco.trainByRound().next()`) the event cycle is:
   * a) During onRoundBeginCommunication,
   *   1. a peer that joined mid-training syncs its model with the latest one
   *   2. the peer notifies the server that they want to join the next round
   *   3. the peer waits until there are enough participants, setting the status
   *      to "not enough participants" while it does
   *   4. finishes by updating the status to "local training"
   * b) local training (the status remains "local training")
   * c) During onRoundEndCommunication
   *   1. the peer sets its status to "waiting for peers to share weights"
   *      and notifies the server that they are ready to share weights
   *   2. wait for the server to answer with the current round's peers list
   *      this is where the nb of participants is updated
   *   3. set status to "connecting to peers" and establish the connections
   *   4. set status to "updating model" and exchange weight updates
   *
   * A single call to next() performs a full round: a), b) and c). It only
   * resolves once the peers exchanged their weight updates, so a call made
   * while the round can't complete stays pending. `Participant` therefore
   * splits a round in `startRound()` and `completeRound()`, so that the tests
   * can choreograph through the status and participants events instead of
   * awaiting a round right away.
   * Note that RoundLogs.participants is the count seen at the end of local
   * training, before the weight exchange.
   *
   * Every step of that choreography is a named function below asserting the
   * events it expects. Each test then plays the steps leading to the one it
   * covers and ends with that step, which keeps a failure pointing at a single
   * step of the timeline. Put end to end, the steps make up the timeline:
   * - User 1 joins the task
   * - User 2 joins
   * - User 2 leaves (Since minNbOfParticipants condition is not satisfied, the training stops)
   * - User 3 joins (User 3 gets the latest model from User 1 and start local training from that model)
   */
  describe("emit expected events", { timeout: 150_000 }, () => {
    type Peer = Participant<"image", "decentralized">;

    /** Statuses a peer goes through in c), once it is done training */
    const SHARES_WEIGHTS: readonly RoundStatus[] = [
      "waiting for peers to share weights",
      "connecting to peers",
      "updating model",
    ];
    /** Statuses a peer goes through during a round it can complete */
    const FULL_ROUND: readonly RoundStatus[] = [
      "local training",
      ...SHARES_WEIGHTS,
    ];

    let task: Task<"image", "decentralized">;
    let url: URL;
    let dataset: Dataset<DataFormat.Raw["image"]>;
    const joined: Peer[] = [];

    beforeAll(async () => {
      dataset = await datasets.loadLusCOVID();
    });

    beforeEach(async () => {
      const decentralized = await lusCovidDecentralized();
      task = decentralized.task;
      url = await startServer(
        defaultModels.LUSClassifier,
        decentralized.taskProvider,
      );
    });

    afterEach(async () => {
      await Promise.all(joined.splice(0).map(async (p) => await p.leave()));
    });

    /** Have a new peer join the task, closed at the end of the test */
    function join(name: string): Peer {
      const peer = new Participant(name, task, url, dataset);
      joined.push(peer);
      return peer;
    }

    /**
     * A peer joining a task nobody else is on: it waits in a) and doesn't even
     * start training, so its round can't complete.
     */
    async function joinsAlone(name: string): Promise<Peer> {
      const peer = join(name).startRound();

      await peer.expectStatuses("not enough participants");
      await peer.expectParticipants(1);

      return peer;
    }

    /** A peer joining a waiting one, releasing it from a) so that both train */
    async function joinsWaitingPeer(
      waiting: Peer,
      name: string,
    ): Promise<Peer> {
      const peer = join(name).startRound();

      // the newcomer has enough participants right away and goes to b)
      await peer.expectStatuses("local training");
      // the waiting peer is released from a) and trains too
      await waiting.expectParticipants(2);
      await waiting.expectStatuses("local training");
      await peer.expectParticipants(2);

      return peer;
    }

    /**
     * Complete the round every peer started, expecting each of them to go
     * through the given statuses and to have seen every other peer.
     */
    async function completesRound(
      peers: readonly Peer[],
      statuses: readonly RoundStatus[],
    ): Promise<void> {
      const logs = await Promise.all(
        peers.map(async (peer) => await peer.completeRound()),
      );
      for (const log of logs) expect(log.participants).equal(peers.length);

      for (const peer of peers) await peer.expectStatuses(...statuses);
      // receiving the round's peers list updates the participants
      for (const peer of peers) await peer.expectParticipants(peers.length);
    }

    /** Peers done with their local training exchange their weight updates */
    const exchangesWeights = (...peers: readonly Peer[]) =>
      completesRound(peers, SHARES_WEIGHTS);

    /** A round during which every peer is present, so a), b) and c) run */
    const runsFullRound = (...peers: readonly Peer[]) =>
      completesRound(peers, FULL_ROUND);

    /** A peer starting a round which it can't complete on its own */
    async function startsRoundAndWaitsForWeights(peer: Peer): Promise<void> {
      peer.startRound();

      // the peer trains and then enters c). It cannot reach "connecting to
      // peers" yet: that only happens once the server answers with the round's
      // peers list
      await peer.expectStatuses(
        "local training",
        "waiting for peers to share weights",
      );
    }

    /** A peer leaving, dropping the remaining one below minNbOfParticipants */
    async function leavesTask(leaving: Peer, remaining: Peer): Promise<void> {
      await leaving.leave();

      await remaining.expectParticipants(1);
      await remaining.expectStatuses("not enough participants");
    }

    /** A newcomer joining a peer which is stuck in c) waiting for weights */
    async function joinsPeerWaitingForWeights(
      waiting: Peer,
      name: string,
    ): Promise<Peer> {
      const peer = join(name).startRound();

      await peer.expectParticipants(2);
      // the newcomer syncs its model in a) then trains
      await peer.expectStatuses("local training");
      // the waiting peer learns the newcomer joined and is still in c) waiting
      // for it to be ready, so it rolls back to the status it had before
      // waiting for more participants
      await waiting.expectParticipants(2);
      await waiting.expectStatuses("waiting for peers to share weights");

      return peer;
    }

    /** The waiting peer and the newcomer exchange their weight updates */
    async function exchangesWeightsWithNewcomer(
      waiting: Peer,
      newcomer: Peer,
    ): Promise<void> {
      const logs = await Promise.all([
        waiting.completeRound(),
        newcomer.completeRound(),
      ]);
      // both trained while two participants were around: the waiting peer
      // before the other one left, the newcomer after it joined
      for (const log of logs) expect(log.participants).equal(2);

      // the waiting peer already announced it was waiting for weights
      await waiting.expectStatuses("connecting to peers", "updating model");
      await waiting.expectParticipants(2);
      await newcomer.expectStatuses(...SHARES_WEIGHTS);
      await newcomer.expectParticipants(2);
    }

    it("a peer joining alone waits for a second participant", async () => {
      await joinsAlone("user 1");
    });

    it("a joining peer lets both of them train", async () => {
      const user1 = await joinsAlone("user 1");

      await joinsWaitingPeer(user1, "user 2");
    });

    it("peers exchange their weights at the end of the round", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingPeer(user1, "user 2");

      await exchangesWeights(user1, user2);
    });

    // regression test, peer used to display missing participants when
    // it was not the case
    it("doesn't report missing participants while a peer trains", async () => {
      const user1 = await joinsAlone("user 1");
      await joinsWaitingPeer(user1, "user 2");

      // user 1 is done training first and has to wait for user 2 to be ready,
      // but shouldn't be told that participants are missing: user 2 is here,
      // only still training. The status following "local training" must go
      // straight to the weight exchange.
      await user1.expectStatuses("waiting for peers to share weights");
    });

    it("a round runs the whole cycle when both peers are present", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingPeer(user1, "user 2");
      await exchangesWeights(user1, user2);

      await runsFullRound(user1, user2);

      // weights should have converged after exchanging updates
      await expectPeersToAgreeOnModel(
        user1.modelsAtRoundBoundary,
        user2.modelsAtRoundBoundary,
      );
    });

    it("a peer waiting for weights is told when the other leaves", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingPeer(user1, "user 2");
      await exchangesWeights(user1, user2);
      await startsRoundAndWaitsForWeights(user1);

      await leavesTask(user2, user1);
    });

    it("a peer joining mid-training syncs the latest model", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingPeer(user1, "user 2");
      await exchangesWeights(user1, user2);
      await startsRoundAndWaitsForWeights(user1);
      await leavesTask(user2, user1);

      const user3 = await joinsPeerWaitingForWeights(user1, "user 3");

      // user 3's model should have been synced to the latest global model,
      // i.e. the result of user 1 and user 2's last aggregation. User 1 hasn't
      // completed a new round, so that is still its latest round boundary.
      await expectWSToBeClose(
        await user3.syncedModel(),
        user1.modelsAtRoundBoundary.latest(),
      );

      // the server should accept user 3's weights (they should not be
      // outdated) and let both peers complete their round
      await exchangesWeightsWithNewcomer(user1, user3);
    });

    it("a peer which joined mid-training then runs full rounds", async () => {
      const user1 = await joinsAlone("user 1");
      const user2 = await joinsWaitingPeer(user1, "user 2");
      await exchangesWeights(user1, user2);
      await startsRoundAndWaitsForWeights(user1);
      await leavesTask(user2, user1);
      const user3 = await joinsPeerWaitingForWeights(user1, "user 3");
      await exchangesWeightsWithNewcomer(user1, user3);

      await runsFullRound(user1, user3);

      // weights should have converged between user 1 and user 3 too
      await expectPeersToAgreeOnModel(
        user1.modelsAtRoundBoundary,
        user3.modelsAtRoundBoundary,
      );
    });
  });

  /**
   * We test if the latest model syncing is working when new participant
   * joins in the middle of the training (when the round > 0).
   *
   * The test workflow
   * 1. Start User1 and User2 starts training
   * 2. Let them complete at least one aggregation round
   * 3. Start User3 when aggregationRound is larger than 0
   * 4. When User3 starts training, model synchronization should be triggered first
   * 5. Compare User3's model weights with User1/User2's latest model weights
   */
  it(
    "performs model syncing when new participant joins in the middle of the training",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const discoUser3 = new Disco(task, url, { preprocessOnce: true });

      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1);
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2);

      try {
        const generatorUser1 = discoUser1.trainByRound(dataset);
        const generatorUser2 = discoUser2.trainByRound(dataset);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        // Existing participants should already have the same aggregated model.
        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);

        // A completed round already installed the aggregated model, so the
        // peers hold a round-boundary model they haven't recorded yet: it is
        // what their next "local training" would snapshot, and what a newcomer
        // syncing now receives.
        const boundaryAfterLastRound = [discoUser1, discoUser2].map(
          (disco) =>
            new WeightsContainer(
              disco.trainer.model.weights.weights.map((w) => w.clone()),
            ),
        );

        const waitForModelSynced = Promise.race([
          new Promise<WeightsContainer>((resolve) => {
            discoUser3.on("modelSynced", (weights) => {
              if (weights !== undefined) resolve(weights);
            });
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Timed out waiting for modelSynced")),
              60_000,
            ),
          ),
        ]);

        const generatorUser3 = discoUser3.trainByRound(dataset);
        // The newcomer's round only completes once the other peers join it, so
        // hold the promise. Model syncing happens first, in a), and the
        // provider answers it while the other peers sit between rounds.
        const user3RoundPromise = generatorUser3.next();

        const syncedWeights = await waitForModelSynced;

        // User 3 should have been synced to a model one of the existing peers
        // held at a round boundary, not to a partially trained one
        const candidates = [
          ...modelsUser1.all(),
          ...modelsUser2.all(),
          ...boundaryAfterLastRound,
        ];
        const matchesAProviderModel = candidates.some((candidate) => {
          try {
            expectWeightsToEqual(syncedWeights, candidate);
            return true;
          } catch {
            return false;
          }
        });
        expect(
          matchesAProviderModel,
          `synced model matches none of the ${candidates.length} models the peers held at a round boundary`,
        ).to.be.true;

        // The newcomer's round completes together with the other peers' next one
        const [user3Round] = await Promise.all([
          user3RoundPromise,
          generatorUser1.next(),
          generatorUser2.next(),
        ]);
        expect(user3Round.done).to.be.false;

        boundaryAfterLastRound.forEach((model) => model.dispose());
      } finally {
        // Close clients if not already done
        await discoUser1.close().catch(() => {});
        await discoUser2.close().catch(() => {});
        await discoUser3.close().catch(() => {});
      }
    },
  );

  it(
    "resets decentralized session after all participants leave",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);

      const dataset = await datasets.loadLusCOVID();

      let shapesBeforeReset: number[][];
      let modelTensorCountBeforeReset: number;

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1);
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2);

      try {
        const generatorUser1 = discoUser1.trainByRound(dataset);
        const generatorUser2 = discoUser2.trainByRound(dataset);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        shapesBeforeReset = weightTensorShapes(
          discoUser1.trainer.model.weights,
        );
        modelTensorCountBeforeReset = modelTensorCount(
          discoUser1.trainer.model.weights,
        );

        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);
      } finally {
        await discoUser1.close().catch(() => {});
        await discoUser2.close().catch(() => {});
      }

      const discoUser3 = new Disco(task, url, { preprocessOnce: true });
      const discoUser4 = new Disco(task, url, { preprocessOnce: true });
      const modelsUser3 = recordModelsAtRoundBoundary(discoUser3);
      const modelsUser4 = recordModelsAtRoundBoundary(discoUser4);

      let user3ModelSynced = false;
      let user4ModelSynced = false;

      discoUser3.on("modelSynced", () => {
        user3ModelSynced = true;
      });
      discoUser4.on("modelSynced", () => {
        user4ModelSynced = true;
      });

      try {
        const generatorUser3 = discoUser3.trainByRound(dataset);
        const generatorUser4 = discoUser4.trainByRound(dataset);

        await Promise.all([generatorUser3.next(), generatorUser4.next()]);

        await Promise.all([generatorUser3.next(), generatorUser4.next()]);

        const shapesAfterReset = weightTensorShapes(
          discoUser3.trainer.model.weights,
        );
        const modelTensorCountAfterReset = modelTensorCount(
          discoUser3.trainer.model.weights,
        );

        expect(shapesAfterReset).to.deep.equal(shapesBeforeReset);
        expect(modelTensorCountAfterReset).to.equal(
          modelTensorCountBeforeReset,
        );

        expect(user3ModelSynced).to.equal(false);
        expect(user4ModelSynced).to.equal(false);

        await expectPeersToAgreeOnModel(modelsUser3, modelsUser4);
      } finally {
        await discoUser3.close().catch(() => {});
        await discoUser4.close().catch(() => {});
      }
    },
  );

  it(
    "does not accumulate excessive tensors during decentralized training",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);

      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });

      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1, {
        keep: "latest",
      });
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2, {
        keep: "latest",
      });

      // Take the baseline after client/model initialization so expected model
      const memoryBeforeTraining = tensorMemorySnapshot();

      try {
        const generatorUser1 = discoUser1.trainByRound(dataset);
        const generatorUser2 = discoUser2.trainByRound(dataset);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);
      } finally {
        // release the recorded models, they are not part of what we measure
        modelsUser1.dispose();
        modelsUser2.dispose();
        await discoUser1.close().catch(() => {});
        await discoUser2.close().catch(() => {});
      }

      // Let pending close/disconnect microtasks finish before reading tf.memory().
      await new Promise((resolve) => setImmediate(resolve));

      const memoryAfterTraining = tensorMemorySnapshot();

      expect(memoryAfterTraining.numTensors).to.be.at.most(
        memoryBeforeTraining.numTensors,
      );
    },
  );

  // Check memory difference between decentralized learning rounds
  it(
    "observes tensor memory across decentralized training rounds",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized({
        epochs: 10,
      });
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);

      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      // a single model is kept per peer, so the recording doesn't grow with the
      // number of rounds and the per-round memory measurements stay comparable
      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1, {
        keep: "latest",
      });
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2, {
        keep: "latest",
      });

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
        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);

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
        // release the recorded models, they are not part of what we measure
        modelsUser1.dispose();
        modelsUser2.dispose();
        await Promise.all([
          discoUser1.close().catch(() => {}),
          discoUser2.close().catch(() => {}),
        ]);
      }
    },
  );

  // Check if all the memories are cleaned when clients close
  it(
    "releases decentralized client tensors when clients close",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized({ epochs: 1 });
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
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
            "expected a completed decentralized training round",
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
