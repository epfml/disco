import type * as http from "node:http";
import * as tf from "@tensorflow/tfjs";
import type { DataType, RoundStatus, Task, TaskProvider, EpochLogs } from "@epfml/discojs";
import {
	aggregator as aggregators,
	client as clients,
	Disco,
	defaultTasks,
	WeightsContainer,
} from "@epfml/discojs";
import { List } from "immutable";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Server } from "../../src/index.js";
import { datasets, Queue } from "../utils.js";

async function WSIntoList(ws: WeightsContainer): Promise<List<List<number>>> {
  return List((await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
    (arr) => List(arr),
  ));
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
export async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
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
  weights: WeightsContainer[]
): Promise<void> {
  const reference = weights[0]

  await Promise.all(
    weights.map(async (current) => {
      await expectWSToBeClose(reference, current)
    })
  )
}

const expectWeightsToEqual = (
  a: WeightsContainer,
  b: WeightsContainer,
) => {
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
		task: TaskProvider<DataType, "decentralized">,
	): Promise<URL> {
    const server = await Server.with(task);

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
	): Promise<[WeightsContainer, clients.Client<"decentralized">]> {
		const task = await defaultTasks.cifar10.getTask();
		const aggregator =
			aggregatorType === "mean"
				? new aggregators.MeanAggregator(0, 1, "relative")
				: new aggregators.SecureAggregator();

    const client = new clients.decentralized.DecentralizedClient(url, task, aggregator)
    await client.connect()

    // Perform multiple training rounds
    let weights = WeightsContainer.of(input)
    for (let r = 0; r < rounds; r++) {
      await client.onRoundBeginCommunication()
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      weights = await client.onRoundEndCommunication(weights)
    }

    return [weights, client]
  }

  /**
   * Creates three clients with different update values and returns the aggregated update value between all three clients.
   * The clients have model dimension of 4 model updates to share, which can be seen as their input parameter in makeClient.
   */
  async function reachConsensus (
    url: URL,
    aggregatorType: 'mean' | 'secure',
    rounds = 1
  ): Promise<void> {
    // Expect the clients to reach the mean consensus, for both the mean and secure aggregators
    const contributions = List.of(
      [0.001, 3, 40, 10],
      [0.002, 5, 30, 11],
      [0.003, 13, 11, 12]
    )
    const actual = await Promise.all(
      contributions
        .map(async (w) => await simulateClient(url, aggregatorType, w, rounds))
        .toArray(),
    );
    const consensuses = await Promise.all(actual.map(async ([consensus, client]) => {
      // Disconnect clients once they reached consensus
      await client.disconnect()
      return consensus
    }));

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
  const modelTensorCount = (weights: WeightsContainer): number => weights.weights.length;

  // Return tensor snapshot to check model weight reset
  const tensorMemorySnapshot = () => {
    const memory = tf.memory();

    return {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
    }
  }

  it("single round of cifar 10 with three mean aggregators yields consensus", async () => {
    const url = await startServer(defaultTasks.cifar10);
    await reachConsensus(url, "mean");
  });

  it("several rounds of cifar 10 with three mean aggregators yields consensus", async () => {
    const url = await startServer(defaultTasks.cifar10);
    await reachConsensus(url, "mean", 3);
  });

  it("single round of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(defaultTasks.cifar10);
    await reachConsensus(url, "secure");
  });

  it("several rounds of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(defaultTasks.cifar10);
    await reachConsensus(url, "secure", 3);
  });

  /**
   * Unit tests with 10 participants
   */
  // Mean aggregator
  it("ten cifar10 users reach consensus with mean aggregation", { timeout: 300_000 }, async () => {
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

    const url = await startServer({
      ...defaultTasks.cifar10,
      getTask: () => Promise.resolve(task),
    });
    const dataset = await datasets.loadCifar10();

    const discos = Array.from(
      { length: 10 },
      () => new Disco(task, url, { preprocessOnce: true }),
    );

    try{
      const results = await Promise.all(
        discos.map(async (disco) => {
          const logs = List(await arrayFromAsync(disco.trainByRound(dataset)));
          const lastEpoch = logs.last()?.epochs.last();
          if (lastEpoch === undefined) throw new Error("no epoch ran");

          return [disco.trainer.model.weights, lastEpoch] as [WeightsContainer, EpochLogs];
        })
      );

      await expectAllWSToBeClose(results.map(([weights])=>weights));
    }finally{
      await Promise.all(discos.map((disco) => disco.close()));
    }
  });

  // Byzantine aggregator
  it("ten cifar10 users reach consensus with byzantine aggregation", { timeout: 300_000 }, async () => {
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

    const url = await startServer({
      ...defaultTasks.cifar10,
      getTask: () => Promise.resolve(task),
    });
    const dataset = await datasets.loadCifar10();

    const discos = Array.from(
      { length: 10 },
      () => new Disco(task, url, { preprocessOnce: true }),
    );

    try{
      const results = await Promise.all(
        discos.map(async (disco) => {
          const logs = List(await arrayFromAsync(disco.trainByRound(dataset)));
          const lastEpoch = logs.last()?.epochs.last();
          if (lastEpoch === undefined) throw new Error("no epoch ran");

          return [disco.trainer.model.weights, lastEpoch] as [WeightsContainer, EpochLogs];
        })
      );

      await expectAllWSToBeClose(results.map(([weights])=>weights));
    }finally{
      await Promise.all(discos.map((disco) => disco.close()));
    }
  });

  // Secure aggregator
  it("ten cifar10 users reach consensus with secure aggregation", { timeout: 500_000 }, async () => {
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

    const url = await startServer({
      ...defaultTasks.cifar10,
      getTask: () => Promise.resolve(task),
    });
    const dataset = await datasets.loadCifar10();

    const discos = Array.from(
      { length: 10 },
      () => new Disco(task, url, { preprocessOnce: true }),
    );

    try{
      const results = await Promise.all(
        discos.map(async (disco) => {
          const logs = List(await arrayFromAsync(disco.trainByRound(dataset)));
          const lastEpoch = logs.last()?.epochs.last();
          if (lastEpoch === undefined) throw new Error("no epoch ran");

          return [disco.trainer.model.weights, lastEpoch] as [WeightsContainer, EpochLogs];
        })
      );

      await expectAllWSToBeClose(results.map(([weights])=>weights));
    }finally{
      await Promise.all(discos.map((disco) => disco.close()));
    }
  });

  // syncs model after participants drop below minNbOfParticipants and newcomers join with mean aggregator
  it("peers emit expected events", { timeout: 150_000 }, async () => {
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
      },
    };

    const url = await startServer({
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    });
    const dataset = await datasets.loadLusCOVID();

    /**
     * Test timeline looks like this:
     * - User 1 joins the task
     * - User 2 joins
     * - User 1 leaves (Since minNbOfParticipants condition is not satisfied, the training stops)
     * - User 3 joins (User 3 gets the latest model from User 2 and start local training from that model)
     * - User 2 & 3 leave
     */

    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const discoUser2 = new Disco(task, url, { preprocessOnce: true });

    // Register listeners for user1 and user2 events
    const statusUser1 = new Queue<RoundStatus>();
    const nbParticipantsUser1 = new Queue<number>();
    const statusUser2 = new Queue<RoundStatus>();
    const nbParticipantsUser2 = new Queue<number>();
    discoUser1.on("status", (status) => statusUser1.put(status));
    discoUser1.on("participants", (participants) => nbParticipantsUser1.put(participants));
    discoUser2.on("status", (status) => statusUser2.put(status));
    discoUser2.on("participants", (participants) => nbParticipantsUser2.put(participants));

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
    await Promise.all([
      generatorUser1.next(),
      generatorUser2.next(),
    ]);

    // Both users did connecting -> updating model -> local training
    expect(await statusUser1.next()).equal("connecting to peers");
    expect(await statusUser1.next()).equal("updating model");
    expect(await statusUser1.next()).equal("local training");
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");
    expect(await statusUser2.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);

    // Weights should have converged after exchanging updates
    await expectWSToBeClose(
      discoUser1.trainer.model.weights,
      discoUser2.trainer.model.weights,
    );

    /* USER 2 LEAVES */

    // ROUND3 starts for User 1 before closing User 2, so User 1
    // enters onRoundEndCommunication and emits "connecting to peers"
    const user1WaitingPromise = generatorUser1.next();
    expect(await statusUser1.next()).equal("connecting to peers");

    await discoUser2.close();
    user2Closed = true;

    // Check if User 1 got a signal that there is not enough participants
    expect(await nbParticipantsUser1.next()).equal(1);
    expect(await statusUser1.next()).equal("not enough participants");

    // Snapshot User 1's weights, which will be shared to User 3 for model syncing
    const latestWeights = new WeightsContainer(
      discoUser1.trainer.model.weights.weights.map((w) => w.clone()),
    );

    /* USER 3 JOINS */

    // Create User 3 and register event listeners
    const discoUser3 = new Disco(task, url, { preprocessOnce: true });
    const statusUser3 = new Queue<RoundStatus>();
    const nbParticipantsUser3 = new Queue<number>();
    discoUser3.on("status", (status) => statusUser3.put(status));
    discoUser3.on("participants", (participants) => nbParticipantsUser3.put(participants));

    const waitForUser3ModelSynced = new Promise<WeightsContainer>((resolve) => {
      discoUser3.on("modelSynced", (weights) => {
        if (weights !== undefined) resolve(weights);
      });
    });

    const generatorUser3 = discoUser3.trainByRound(dataset);

    /* ROUND 3 */ 
    /* User 3's first round */
    const user3Round1 = await generatorUser3.next();
    expect(user3Round1.done).to.be.false;
    expect(user3Round1.value.participants).equal(2);

    // User 3's model should have been synced to User 1's weights before training
    const user3SyncedWeights = await waitForUser3ModelSynced;
    await expectWSToBeClose(user3SyncedWeights, latestWeights);

    // User 3 did onRoundBeginCommunication and local training
    expect(await statusUser3.next()).equal("local training");
    expect(await nbParticipantsUser3.next()).equal(2);
    // User 1 learns User 3 joined and is still in onRoundEndCommunication waiting for User 3 to be ready
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await statusUser1.next()).equal("connecting to peers");

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

    // Both users did onRoundEndCommunication, onRoundBeginCommunication, and local training
    expect(await statusUser1.next()).equal("updating model");
    expect(await statusUser1.next()).equal("not enough participants");
    expect(await statusUser1.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(2);

    expect(await statusUser3.next()).equal("connecting to peers");
    expect(await statusUser3.next()).equal("updating model");
    expect(await statusUser3.next()).equal("local training");
    expect(await nbParticipantsUser3.next()).equal(2);


    // Weights should have converged between User 1 and User 3 after the exchange
    await expectWSToBeClose(
      discoUser1.trainer.model.weights,
      discoUser3.trainer.model.weights,
    );

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
  it("Model Syncing when new participant joins in the middle of the training", { timeout: 200_000 }, async () => {
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
      },
    };

    const url = await startServer({
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    });
    const dataset = await datasets.loadLusCOVID();

    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const discoUser2 = new Disco(task, url, { preprocessOnce: true });
    const discoUser3 = new Disco(task, url, { preprocessOnce: true });

    try {
      const generatorUser1 = discoUser1.trainByRound(dataset);
      const generatorUser2 = discoUser2.trainByRound(dataset);

      await Promise.all([
        generatorUser1.next(),
        generatorUser2.next(),
      ]);

      await Promise.all([
        generatorUser1.next(),
        generatorUser2.next(),
      ]);

      // Existing participants should already have the same aggregated model.
      await expectWSToBeClose(
        discoUser1.trainer.model.weights,
        discoUser2.trainer.model.weights,
      );

      const waitForModelSynced = Promise.race([
        new Promise<{
          syncedWeights: WeightsContainer;
          providerWeightsUser1: WeightsContainer;
          providerWeightsUser2: WeightsContainer;
        }>((resolve) => {
          discoUser3.on("modelSynced", (weights) => {
            if (weights !== undefined) {
              resolve({
                syncedWeights: weights,
                providerWeightsUser1: new WeightsContainer(
                  discoUser1.trainer.model.weights.weights.map((w) => w.clone()),
                ),
                providerWeightsUser2: new WeightsContainer(
                  discoUser2.trainer.model.weights.weights.map((w) => w.clone()),
                ),
              });
            }
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

        await Promise.all([
          generatorUser1.next(),
          generatorUser2.next(),
        ]);
      }

      const {
        syncedWeights,
        providerWeightsUser1,
        providerWeightsUser2,
      } = await waitForModelSynced;

      try {
        expectWeightsToEqual(syncedWeights, providerWeightsUser1);
      } catch {
        expectWeightsToEqual(syncedWeights, providerWeightsUser2);
      }

      const user3Round = await user3RoundPromise;
      expect(user3Round.done).to.be.false;
    } finally {
      await discoUser1.close();
      await discoUser2.close();
      await discoUser3.close();
    }
  });

  it("resets decentralized session after all participants leave", { timeout: 200_000 }, async () => {
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
      },
    };

    const url = await startServer({
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    });

    const dataset = await datasets.loadLusCOVID();

    let shapesBeforeReset: number[][];
    let modelTensorCountBeforeReset: number;

    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const discoUser2 = new Disco(task, url, { preprocessOnce: true });

    try {
      const generatorUser1 = discoUser1.trainByRound(dataset);
      const generatorUser2 = discoUser2.trainByRound(dataset);

      await Promise.all([
        generatorUser1.next(),
        generatorUser2.next(),
      ]);

      await Promise.all([
        generatorUser1.next(),
        generatorUser2.next(),
      ]);

      shapesBeforeReset = weightTensorShapes(discoUser1.trainer.model.weights);
      modelTensorCountBeforeReset = modelTensorCount(
        discoUser1.trainer.model.weights,
      );

      await expectWSToBeClose(
        discoUser1.trainer.model.weights,
        discoUser2.trainer.model.weights,
      );
    } finally {
      await discoUser1.close().catch(() => {});
      await discoUser2.close().catch(() => {});
    }

    const discoUser3 = new Disco(task, url, { preprocessOnce: true });
    const discoUser4 = new Disco(task, url, { preprocessOnce: true });

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

      await Promise.all([
        generatorUser3.next(),
        generatorUser4.next(),
      ]);

      await Promise.all([
        generatorUser3.next(),
        generatorUser4.next(),
      ]);

      const shapesAfterReset = weightTensorShapes(discoUser3.trainer.model.weights);
      const modelTensorCountAfterReset = modelTensorCount(discoUser3.trainer.model.weights);

      expect(shapesAfterReset).to.deep.equal(shapesBeforeReset);
      expect(modelTensorCountAfterReset).to.equal(modelTensorCountBeforeReset);

      expect(user3ModelSynced).to.equal(false);
      expect(user4ModelSynced).to.equal(false);

      await expectWSToBeClose(
        discoUser3.trainer.model.weights,
        discoUser4.trainer.model.weights,
      );
    } finally {
      await discoUser3.close().catch(() => {});
      await discoUser4.close().catch(() => {});
    }
  });

  it("does not accumulate excessive tensors during decentralized training", { timeout: 200_000 }, async () => {
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
      },
    };

    const url = await startServer({
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    });

    const dataset = await datasets.loadLusCOVID();

    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const discoUser2 = new Disco(task, url, { preprocessOnce: true });

    // Take the baseline after client/model initialization so expected model
    const memoryBeforeTraining = tensorMemorySnapshot();

    let modelTensorCountAfterTraining: number;

    try {
      const generatorUser1 = discoUser1.trainByRound(dataset);
      const generatorUser2 = discoUser2.trainByRound(dataset);

      await Promise.all([
        generatorUser1.next(),
        generatorUser2.next(),
      ]);

      await Promise.all([
        generatorUser1.next(),
        generatorUser2.next(),
      ]);

      await expectWSToBeClose(
        discoUser1.trainer.model.weights,
        discoUser2.trainer.model.weights,
      );
    } finally {
      await discoUser1.close().catch(() => {});
      await discoUser2.close().catch(() => {});
    }

    // Let pending close/disconnect microtasks finish before reading tf.memory().
    await new Promise((resolve) => setImmediate(resolve));

    const memoryAfterTraining = tensorMemorySnapshot();

    expect(memoryAfterTraining.numTensors).to.be.at.most(memoryBeforeTraining.numTensors);
  });
})
