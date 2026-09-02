import type * as http from "node:http";
import type {
  DataType,
  RoundStatus,
  Client,
  Task,
  TaskProvider,
  ModelCard,
  Network,
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
import { afterEach, describe, expect, it } from "vitest";
import { Server } from "../../src/index.js";
import { datasets, Queue } from "../utils.js";
import * as tf from "@tensorflow/tfjs-node";

async function WSIntoList(ws: WeightsContainer): Promise<List<List<number>>> {
  return List(
    (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
      (arr) => List(arr),
    ),
  );
}

async function expectWSToBeClose(
  left: WeightsContainer,
  right: WeightsContainer,
): Promise<void> {
  for (const tensors of (await WSIntoList(left)).zip(await WSIntoList(right)))
    for (const [l, r] of tensors[0].zip(tensors[1]))
      expect(l).to.be.closeTo(r, 1e-4);
}

// function from federated.spec.ts
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

// function to check if weights across all participants are close to each other
async function expectAllWSToBeClose(
  weights: WeightsContainer[],
): Promise<void> {
  const reference = weights[0];

  await Promise.all(
    weights.map(async (current) => {
      await expectWSToBeClose(reference, current);
    }),
  );
}

/**
 * Records the model a peer holds at each round boundary: once
 * onRoundEndCommunication has returned and before the next local round trains
 * on it. Peers hold the very same model at those points, whereas
 * `trainer.model.weights` read afterwards also contains each peer's own local
 * training, which is not reproducible across peers.
 *
 * Pass `keep: "latest"` in the tests measuring tensor memory so that the
 * recorded models don't grow with the number of rounds.
 */
function recordModelsAtRoundBoundary<D extends DataType, N extends Network>(
  disco: Disco<D, N>,
  { keep = "all" }: { keep?: "all" | "latest" } = {},
): {
  all: () => readonly WeightsContainer[];
  latest: () => WeightsContainer;
  dispose: () => void;
} {
  const models: WeightsContainer[] = [];

  disco.on("status", (status) => {
    if (status !== "local training") return;
    if (keep === "latest") models.splice(0).forEach((m) => m.dispose());
    models.push(
      new WeightsContainer(
        disco.trainer.model.weights.weights.map((w) => w.clone()),
      ),
    );
  });

  return {
    all: () => models,
    latest: () => {
      const model = models.at(-1);
      if (model === undefined)
        throw new Error("the peer hasn't reached a round boundary yet");
      return model;
    },
    dispose: () => models.splice(0).forEach((m) => m.dispose()),
  };
}

/** The peers should hold the same model at their latest round boundary */
async function expectPeersToAgreeOnModel(
  ...recordings: { latest: () => WeightsContainer }[]
): Promise<void> {
  const [first, ...others] = recordings;
  for (const other of others)
    await expectWSToBeClose(first.latest(), other.latest());
}

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

        await expectAllWSToBeClose(results.map(([weights]) => weights));
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

        await expectAllWSToBeClose(results.map(([weights]) => weights));
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

        await expectAllWSToBeClose(results.map(([weights]) => weights));
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

  // syncs model after participants drop below minNbOfParticipants and newcomers join with mean aggregator
  it("emit expected events", { timeout: 150_000 }, async () => {
    const { task, taskProvider } = await lusCovidDecentralized();
    const url = await startServer(defaultModels.LUSClassifier, taskProvider);
    const dataset = await datasets.loadLusCOVID();

    /**
     * At each round (each call to `disco.trainByRound`) the event cycle is:
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
     * Note that the wait for more participants happens in a), before local
     * training: a lone peer doesn't train until the minimum is reached.
     *
     * Given this, it is important to note that calling disco.trainByRound().next()
     * for the first time will perform a) and then b) where it stops and yields the round logs.
     * Thus, c) isn't called and the weight sharing is not performed during this call to next().
     * Calling next() again will then run c), as well as a) and b) again.
     *
     * Test timeline looks like this:
     * - User 1 joins the task
     * - User 2 joins
     * - User 2 leaves (Since minNbOfParticipants condition is not satisfied, the training stops)
     * - User 3 joins (User 3 gets the latest model from User 1 and start local training from that model)
     * - User 1 & 3 leave
     */

    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const discoUser2 = new Disco(task, url, { preprocessOnce: true });

    // Register listeners for user1 and user2 events
    const statusUser1 = new Queue<RoundStatus>();
    const nbParticipantsUser1 = new Queue<number>();
    const statusUser2 = new Queue<RoundStatus>();
    const nbParticipantsUser2 = new Queue<number>();
    discoUser1.on("status", (status) => statusUser1.put(status));
    discoUser1.on("participants", (participants) =>
      nbParticipantsUser1.put(participants),
    );
    discoUser2.on("status", (status) => statusUser2.put(status));
    discoUser2.on("participants", (participants) =>
      nbParticipantsUser2.put(participants),
    );

    const modelsUser1 = recordModelsAtRoundBoundary(discoUser1);
    const modelsUser2 = recordModelsAtRoundBoundary(discoUser2);

    let user2Closed = false;

    const generatorUser1 = discoUser1.trainByRound(dataset);
    const generatorUser2 = discoUser2.trainByRound(dataset);

    /* ROUND 1 */
    /* USER 1 JOINS */
    const round1User1Promise = generatorUser1.next();
    expect(await statusUser1.next()).equal("not enough participants");
    // We expect only one participant
    expect(await nbParticipantsUser1.next()).equal(1);

    /* USER 2 JOINS */
    /* minNbOfParticipants condition satisfied, local training starts */
    const round1User2Promise = generatorUser2.next();
    await Promise.all([round1User1Promise, round1User2Promise]);

    expect(await statusUser2.next()).equal("local training");
    expect(await statusUser1.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);

    /* ROUND 2 - first weight exchange */
    await Promise.all([generatorUser1.next(), generatorUser2.next()]);

    // Both users did waiting for peers -> connecting -> updating model -> local training
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser1.next()).equal("connecting to peers");
    expect(await statusUser1.next()).equal("updating model");
    expect(await statusUser1.next()).equal("local training");
    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");
    expect(await statusUser2.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);

    // Weights should have converged after exchanging updates
    await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);

    /* USER 2 LEAVES */

    // ROUND3 starts for User 1 before closing User 2, so User 1 enters
    // onRoundEndCommunication and emits "waiting for peers to share weights".
    // It cannot reach "connecting to peers" yet: that only happens once the
    // server answers with the round's peer list.
    const user1WaitingPromise = generatorUser1.next();
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );

    await discoUser2.close();
    user2Closed = true;

    // Check if User 1 got a signal that there is not enough participants
    expect(await nbParticipantsUser1.next()).equal(1);
    expect(await statusUser1.next()).equal("not enough participants");

    /* USER 3 JOINS */

    // Create User 3 and register event listeners
    const discoUser3 = new Disco(task, url, { preprocessOnce: true });
    const statusUser3 = new Queue<RoundStatus>();
    const nbParticipantsUser3 = new Queue<number>();
    discoUser3.on("status", (status) => statusUser3.put(status));
    discoUser3.on("participants", (participants) =>
      nbParticipantsUser3.put(participants),
    );

    const waitForUser3ModelSynced = new Promise<WeightsContainer>((resolve) => {
      discoUser3.on("modelSynced", (weights) => {
        if (weights !== undefined) resolve(weights);
      });
    });

    const modelsUser3 = recordModelsAtRoundBoundary(discoUser3);
    const generatorUser3 = discoUser3.trainByRound(dataset);

    /* ROUND 3 */
    /* User 3's first round */
    const user3Round1 = await generatorUser3.next();
    expect(user3Round1.done).to.be.false;
    expect(user3Round1.value.participants).equal(2);

    // User 3's model should have been synced to the latest global model,
    // i.e. the result of User 1 and User 2's last aggregation. User 1 is stuck
    // in onRoundEndCommunication, so that is still its latest round boundary.
    const user3SyncedWeights = await waitForUser3ModelSynced;
    await expectWSToBeClose(user3SyncedWeights, modelsUser1.latest());

    // User 3 did onRoundBeginCommunication and local training
    expect(await statusUser3.next()).equal("local training");
    expect(await nbParticipantsUser3.next()).equal(2);
    // User 1 learns User 3 joined and is still in onRoundEndCommunication waiting for User 3 to be ready,
    // so it rolls back to the status it had before waiting for more participants
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );

    /* ROUND 4 */
    /* first weight exchange between User 1 and User 3 */
    const [user1Round, user3Round2] = await Promise.all([
      user1WaitingPromise,
      generatorUser3.next(),
    ]);
    expect(user1Round.done).to.be.false;
    expect(user3Round2.done).to.be.false;
    expect(user1Round.value.participants).equal(2);
    expect(user3Round2.value.participants).equal(2);

    // Both users did onRoundEndCommunication, onRoundBeginCommunication, and local training.
    // User 1 doesn't wait for participants at the start of round 4: User 3 is here,
    // so the minimum is met when User 1 begins the round.
    expect(await statusUser1.next()).equal("connecting to peers");
    expect(await statusUser1.next()).equal("updating model");
    expect(await statusUser1.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(2);

    expect(await statusUser3.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser3.next()).equal("connecting to peers");
    expect(await statusUser3.next()).equal("updating model");
    expect(await statusUser3.next()).equal("local training");
    expect(await nbParticipantsUser3.next()).equal(2);

    // Weights should have converged between User 1 and User 3 after the exchange
    await expectPeersToAgreeOnModel(modelsUser1, modelsUser3);

    await discoUser3.close();
    await discoUser1.close().catch(() => {});
    if (!user2Closed) await discoUser2.close().catch(() => {});
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
        const user3RoundPromise = generatorUser3.next();

        await new Promise((resolve) => setTimeout(resolve, 5_000));

        // The newcomer may ask for synchronization while existing participants are
        // already in the next local round. Progress peers until the provider sends the latest model.
        for (let attempt = 0; attempt < 5; attempt++) {
          const synced = await Promise.race([
            waitForModelSynced.then(() => true),
            new Promise<boolean>((resolve) =>
              setTimeout(() => resolve(false), 100),
            ),
          ]);

          if (synced) break;

          await Promise.all([generatorUser1.next(), generatorUser2.next()]);
        }

        const syncedWeights = await waitForModelSynced;

        // User 3 should have been synced to a model one of the existing peers
        // held at a round boundary, not to a partially trained one
        const candidates = [...modelsUser1.all(), ...modelsUser2.all()];
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

        const user3Round = await user3RoundPromise;
        expect(user3Round.done).to.be.false;
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

  // regression test, peer used to display missing participants when
  // it was not the case
  it(
    "doesn't report missing participants when peer is sharing its weights",
    { timeout: 100_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
      const dataset = await datasets.loadLusCOVID();

      /**
       * The timeline is:
       * - User 1 joins the task by themselves and waits for a second participant
       * - User 2 joins, both train locally
       * - User 1 is done training and waits for User 2 to share its weights
       *
       * User 1 has to wait for User 2 to be ready but shouldn't be told that
       * participants are missing: User 2 is here, only still training.
       */

      /* USER 1 JOINS */

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const statusUser1 = new Queue<RoundStatus>();
      discoUser1.on("status", (status) => {
        statusUser1.put(status);
      });
      const generatorUser1 = discoUser1.trainByRound(dataset);

      // a) blocks until a second participant joins, so don't await it yet
      const logUser1Round1 = generatorUser1.next();
      expect(await statusUser1.next()).equal("not enough participants");

      /* USER 2 JOINS, BOTH CAN TRAIN */

      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const generatorUser2 = discoUser2.trainByRound(dataset);
      await Promise.all([logUser1Round1, generatorUser2.next()]); // a) and b)

      // there are enough participants now, User 1 trains locally
      expect(await statusUser1.next()).equal("local training");

      /* USER 1 IS DONE TRAINING, USER 2 HASN'T SHARED ITS WEIGHTS YET */

      const logUser1Round2 = generatorUser1.next(); // c)
      expect(await statusUser1.next()).equal(
        "waiting for peers to share weights",
      );

      /* USER 2 IS DONE TRAINING TOO */

      await generatorUser2.next();
      await logUser1Round2;
      expect(await statusUser1.next()).equal("connecting to peers");
      expect(await statusUser1.next()).equal("updating model");

      await discoUser1.close();
      await discoUser2.close();
    },
  );
});
