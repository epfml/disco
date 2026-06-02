import type * as http from "node:http";
import type { DataType, RoundStatus, Task, TaskProvider, EpochLogs } from "@epfml/discojs";
import {
	aggregator as aggregators,
	client as clients,
	Disco,
	defaultTasks,
	WeightsContainer,
} from "@epfml/discojs";
import { List } from "immutable";
import { afterEach, describe, expect, it } from "vitest";
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

  it("peers emit expected events", { timeout: 300_000 }, async () => {
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
			},
		};
		const url = await startServer({
			...defaultTasks.lusCovid,
			getTask: () => Promise.resolve(task),
		});
		const dataset = await datasets.loadLusCOVID();

    /**
     * Then at each round (each call to `disco.trainByRound`) the event cycle is:
     * a) During onRoundBeingCommunication, 
     *   1. the peer notifies the server that they want to join the next round
     *   2. finishes by updating the status to "local training"
     * (without waiting for a server answer)
     * b) local training (the status remains "local training")
     * c) During onRoundEndCommunication 
     *   1. the peer notifies the server that they are ready to share weights 
     *      set status to "connecting to peers"
     *   2. wait for the server to answer with the current round's peers list
     *      this is where the nb of participants is updated
     *   3. establish peer-to-peer connections 
     *   4. set status to "updating model" and exchange weight updates
     * 
     * Given this, it is important to note that calling disco.trainByRound().next()
     * for the first time will perform a) and then b) where it stops and yields the round logs.
     * Thus, c) isn't called and the weight sharing is not performed during this call to next().
     * Calling next() again will then run c), as well as a) and b) again.
     * 
     * In this test the timeline is:
     * - User 1 joins the task by themselves
     * - User 2 joins
     * - User 1 leaves
     * - User 3 joins
     * - User 2 & 3 leave
     */

    /* USER 1 JOINS */

    const discoUser1 = new Disco(task, url, { preprocessOnce: true });
    const statusUser1 = new Queue<RoundStatus>();
    const nbParticipantsUser1 = new Queue<number>();
    discoUser1.on("status", status => { statusUser1.put(status) })
    discoUser1.on("participants", (participants) => { nbParticipantsUser1.put(participants) })
    const generatorUser1 = discoUser1.trainByRound(dataset)
    
    // Have User 1 join the task and train locally for one round
    const logUser1Round1 = await generatorUser1.next()
    expect(logUser1Round1.done).to.be.false
    // User 1 did a) and b) so their status should be Training
    expect(await statusUser1.next()).equal("local training")
    expect(await nbParticipantsUser1.next()).equal(1)

    if (logUser1Round1.done)
      throw new Error("User 1 finished training at the 1st round")
    // participant list not updated yet (updated at step c))
    expect((logUser1Round1.value).participants).equal(1)

    // Calling next() a 2nd time makes User 1 go to c) where the peer should
    // stay stuck awaiting until another participant joins
    const logUser1Round2Promise = generatorUser1.next()
    expect(await statusUser1.next()).equal("connecting to peers") // tries to connect to peers
    expect(await statusUser1.next()).equal("not enough participants") // but has to wait for more participants

    /* USER 2 JOINS */

    const discoUser2 = new Disco(task, url, { preprocessOnce: true });
    const statusUser2 = new Queue<RoundStatus>();
    const nbParticipantsUser2 = new Queue<number>();
    discoUser2.on("status", status => { statusUser2.put(status) })
    discoUser2.on("participants", (participants) => { nbParticipantsUser2.put(participants) })
    const generatorUser2 = discoUser2.trainByRound(dataset)

    // Have User 2 join the task and train for one round
    const logUser2Round1 = await generatorUser2.next()
    expect(logUser2Round1.done).to.be.false
    if (logUser2Round1.done)
      throw new Error("User 2 finished training at the 1st round")
    // round payload should contain the number of participants
    expect((logUser2Round1.value).participants).equal(2)
    expect(await nbParticipantsUser2.next()).equal(2)
    // Receive the EnoughParticipants message with the participants
    expect(await nbParticipantsUser1.next()).equal(2)
    // User 2 did a) and b)
    expect(await statusUser2.next()).equal("local training")
    // User 1 is still in c) now waiting for user 2 to be ready to exchange weight updates
    expect(await statusUser1.next()).equal("connecting to peers")

    /* ROUND 2 */

    // The server should answer with the round's peers list. 
    // Peers then exchange updates and then start training locally with the new weights
    const logUser2Round2 = await generatorUser2.next()
    const logUser1Round2 = await logUser1Round2Promise // the promise can resolve now
    expect(logUser1Round2.done).to.be.false
    expect(logUser2Round2.done).to.be.false
    if (logUser1Round2.done || logUser2Round2.done)
      throw new Error("User 1 or 2 finished training at the 2nd round")
    // nb of participants should now be updated
    expect((logUser1Round2.value).participants).equal(2)
    expect((logUser2Round2.value).participants).equal(2)
    expect(await nbParticipantsUser2.next()).equal(2)
    expect(await nbParticipantsUser1.next()).equal(2)
    // User 1 and 2 did c), a) and b)
    expect(await statusUser1.next()).equal("updating model") // second to last
    expect(await statusUser1.next()).equal("local training")

    expect(await statusUser2.next()).equal("connecting to peers") // back to connecting when user 1 joins
    expect(await statusUser2.next()).equal("updating model")
    expect(await statusUser2.next()).equal("local training")
    
    /* USER 1 LEAVES */

    await discoUser1.close()
    // Disconnect updates the number of participants
    expect(await nbParticipantsUser1.next()).equal(1)
    // User 2 receives the WaitingForMoreParticipants message
    expect(await nbParticipantsUser2.next()).equal(1)
    // server notifies user 2 to wait
    expect(await statusUser2.next()).equal("not enough participants")
    // Make user 2 go to c)
    const logUser2Round3Promise = generatorUser2.next()
    // await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    // starts c) and waits for user 3 to join
    expect(await statusUser2.next()).equal("connecting to peers")
    expect(await statusUser2.next()).equal("not enough participants")

    /* USER 3 JOINS */

    // Create User 3
    const discoUser3 = new Disco(task, url, { preprocessOnce: true });
    const statusUser3 = new Queue<RoundStatus>();
    const nbParticipantsUser3 = new Queue<number>();
    discoUser3.on("status", status => { statusUser3.put(status) })
    discoUser3.on("participants", (participants) => { nbParticipantsUser3.put(participants) })
    const generatorUser3 = discoUser3.trainByRound(dataset)

    // User 3 joins mid-training and trains one local round
    const logUser3Round1 = await generatorUser3.next()
    expect(logUser3Round1.done).to.be.false
    if (logUser3Round1.done)
      throw new Error("User 3 finished training at the 1st round")
    expect((logUser3Round1.value).participants).equal(2)
    expect(await nbParticipantsUser3.next()).equal(2)
    // User 2 receives the EnoughParticipants message
    // User 2 is still in c) waiting for user 3 to share their local update
    expect(await nbParticipantsUser2.next()).equal(2)
  
    // User 3 did a) and b)
    expect(await statusUser3.next()).equal("local training")
    // User 2 is still in c) waiting for user 3 to be ready to exchange waits
    expect(await statusUser2.next()).equal("connecting to peers")
    
    /* ROUND 3 */

    // User 3 notifies the server that they are ready to exchange waits
    // then user 2 and 3 exchange weight updates
    const logUser3Round3 = await generatorUser3.next()
    const logUser2Round3 = await logUser2Round3Promise // the promise can resolve now
    if (logUser3Round3.done || logUser2Round3.done)
      throw new Error("User 1 or 2 finished training at the 3rd round")
    
    expect(logUser2Round3.value.participants).equal(2)
    expect(logUser3Round3.value.participants).equal(2)
    expect(await nbParticipantsUser3.next()).equal(2)
    expect(await nbParticipantsUser2.next()).equal(2)

    // both user 2 and 3 did c), a) and are now in b)
    expect(await statusUser2.next()).equal("updating model")
    expect(await statusUser2.next()).equal("local training")

    expect(await statusUser3.next()).equal("connecting to peers")
    expect(await statusUser3.next()).equal("updating model")
    expect(await statusUser3.next()).equal("local training")
    
    /* USER 2 AND 3 LEAVE */

    await discoUser2.close()
    expect(await statusUser3.next()).equal("not enough participants")
    expect(await nbParticipantsUser3.next()).equal(1)

    await discoUser3.close()
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
})
