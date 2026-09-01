import type * as http from "node:http";
import type {
  DataType,
  RoundStatus,
  Client,
  Task,
  TaskProvider,
  ModelCard,
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

  /** The LUS COVID task, decentralized between at least two participants */
  async function lusCovidDecentralized(): Promise<{
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

  it("peers emit expected events", { timeout: 100_000 }, async () => {
    const { task, taskProvider } = await lusCovidDecentralized();
    const url = await startServer(defaultModels.LUSClassifier, taskProvider);
    const dataset = await datasets.loadLusCOVID();

    /**
     * Then at each round (each call to `disco.trainByRound`) the event cycle is:
     * a) During onRoundBeingCommunication,
     *   1. the peer notifies the server that they want to join the next round
     *   2. finishes by updating the status to "local training"
     * (without waiting for a server answer)
     * b) local training (the status remains "local training")
     * c) During onRoundEndCommunication
     *   1. the peer sets its status to "waiting for peers to share weights"
     *      and notifies the server that they are ready to share weights
     *   2. wait for the server to answer with the current round's peers list
     *      this is where the nb of participants is updated
     *   3. set status to "connecting to peers" and establish the connections
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
    discoUser1.on("status", (status) => {
      statusUser1.put(status);
    });
    discoUser1.on("participants", (participants) => {
      nbParticipantsUser1.put(participants);
    });
    const generatorUser1 = discoUser1.trainByRound(dataset);

    // Have User 1 join the task and train locally for one round
    const logUser1Round1 = await generatorUser1.next();
    expect(logUser1Round1.done).to.be.false;
    // User 1 did a) and b) so their status should be Training
    expect(await statusUser1.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(1);

    if (logUser1Round1.done)
      throw new Error("User 1 finished training at the 1st round");
    // participant list not updated yet (updated at step c))
    expect(logUser1Round1.value.participants).equal(1);

    // Calling next() a 2nd time makes User 1 go to c) where the peer should
    // stay stuck awaiting until another participant joins
    const logUser1Round2Promise = generatorUser1.next();
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    ); // ready to share
    expect(await statusUser1.next()).equal("not enough participants"); // but has to wait for more participants

    /* USER 2 JOINS */

    const discoUser2 = new Disco(task, url, { preprocessOnce: true });
    const statusUser2 = new Queue<RoundStatus>();
    const nbParticipantsUser2 = new Queue<number>();
    discoUser2.on("status", (status) => {
      statusUser2.put(status);
    });
    discoUser2.on("participants", (participants) => {
      nbParticipantsUser2.put(participants);
    });
    const generatorUser2 = discoUser2.trainByRound(dataset);

    // Have User 2 join the task and train for one round
    const logUser2Round1 = await generatorUser2.next();
    expect(logUser2Round1.done).to.be.false;
    if (logUser2Round1.done)
      throw new Error("User 2 finished training at the 1st round");
    // round payload should contain the number of participants
    expect(logUser2Round1.value.participants).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);
    // Receive the EnoughParticipants message with the participants
    expect(await nbParticipantsUser1.next()).equal(2);
    // User 2 did a) and b)
    expect(await statusUser2.next()).equal("local training");
    // User 1 is still in c) now waiting for user 2 to be ready to exchange weight updates
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );

    /* ROUND 2 */

    // The server should answer with the round's peers list.
    // Peers then exchange updates and then start training locally with the new weights
    const logUser2Round2 = await generatorUser2.next();
    const logUser1Round2 = await logUser1Round2Promise; // the promise can resolve now
    expect(logUser1Round2.done).to.be.false;
    expect(logUser2Round2.done).to.be.false;
    if (logUser1Round2.done || logUser2Round2.done)
      throw new Error("User 1 or 2 finished training at the 2nd round");
    // nb of participants should now be updated
    expect(logUser1Round2.value.participants).equal(2);
    expect(logUser2Round2.value.participants).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);
    expect(await nbParticipantsUser1.next()).equal(2);
    // User 1 and 2 did c), a) and b)
    expect(await statusUser1.next()).equal("connecting to peers");
    expect(await statusUser1.next()).equal("updating model"); // second to last
    expect(await statusUser1.next()).equal("local training");

    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");
    expect(await statusUser2.next()).equal("local training");

    /* USER 1 LEAVES */

    await discoUser1.close();
    // Disconnect updates the number of participants
    expect(await nbParticipantsUser1.next()).equal(1);
    // User 2 receives the WaitingForMoreParticipants message
    expect(await nbParticipantsUser2.next()).equal(1);
    // server notifies user 2 to wait
    expect(await statusUser2.next()).equal("not enough participants");
    // Make user 2 go to c)
    const logUser2Round3Promise = generatorUser2.next();
    // await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    // starts c) and waits for user 3 to join
    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser2.next()).equal("not enough participants");

    /* USER 3 JOINS */

    // Create User 3
    const discoUser3 = new Disco(task, url, { preprocessOnce: true });
    const statusUser3 = new Queue<RoundStatus>();
    const nbParticipantsUser3 = new Queue<number>();
    discoUser3.on("status", (status) => {
      statusUser3.put(status);
    });
    discoUser3.on("participants", (participants) => {
      nbParticipantsUser3.put(participants);
    });
    const generatorUser3 = discoUser3.trainByRound(dataset);

    // User 3 joins mid-training and trains one local round
    const logUser3Round1 = await generatorUser3.next();
    expect(logUser3Round1.done).to.be.false;
    if (logUser3Round1.done)
      throw new Error("User 3 finished training at the 1st round");
    expect(logUser3Round1.value.participants).equal(2);
    expect(await nbParticipantsUser3.next()).equal(2);
    // User 2 receives the EnoughParticipants message
    // User 2 is still in c) waiting for user 3 to share their local update
    expect(await nbParticipantsUser2.next()).equal(2);

    // User 3 did a) and b)
    expect(await statusUser3.next()).equal("local training");
    // User 2 is still in c) waiting for user 3 to be ready to exchange waits
    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );

    /* ROUND 3 */

    // User 3 notifies the server that they are ready to exchange waits
    // then user 2 and 3 exchange weight updates
    const logUser3Round3 = await generatorUser3.next();
    const logUser2Round3 = await logUser2Round3Promise; // the promise can resolve now
    if (logUser3Round3.done || logUser2Round3.done)
      throw new Error("User 1 or 2 finished training at the 3rd round");

    expect(logUser2Round3.value.participants).equal(2);
    expect(logUser3Round3.value.participants).equal(2);
    expect(await nbParticipantsUser3.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);

    // both user 2 and 3 did c), a) and are now in b)
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");
    expect(await statusUser2.next()).equal("local training");

    expect(await statusUser3.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser3.next()).equal("connecting to peers");
    expect(await statusUser3.next()).equal("updating model");
    expect(await statusUser3.next()).equal("local training");

    /* USER 2 AND 3 LEAVE */

    await discoUser2.close();
    expect(await statusUser3.next()).equal("not enough participants");
    expect(await nbParticipantsUser3.next()).equal(1);

    await discoUser3.close();
  });

  // regression test, peer used to display missing participants when
  // it was not the case
  it(
    "peer sharing its weights doesn't report missing participants",
    { timeout: 100_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
      const dataset = await datasets.loadLusCOVID();

      /**
       * The timeline is:
       * - User 1 joins the task by themselves and trains locally
       * - User 2 joins while User 1 is still training
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

      await generatorUser1.next(); // a) and b)
      expect(await statusUser1.next()).equal("local training");

      /* USER 2 JOINS, WHILE USER 1 IS STILL TRAINING */

      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const generatorUser2 = discoUser2.trainByRound(dataset);
      await generatorUser2.next(); // a) and b)

      // there are enough participants now, User 1 keeps on training
      expect(await statusUser1.next()).equal("local training");

      /* USER 1 IS DONE TRAINING */

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
