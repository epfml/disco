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
     * Given this, it is important to note that a single call to
     * disco.trainByRound().next() performs a full round: a), b) and c).
     * It only resolves once the peers exchanged their weight updates, so when
     * a peer is alone (minNbOfParticipants isn't met) the call stays pending
     * until another participant joins and the round completes. The test
     * therefore holds the pending next() promises and choreographs through
     * the status and participants events instead of awaiting next() right
     * away. Note that RoundLogs.participants is the count seen at the end of
     * local training, before the weight exchange.
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

    // Have User 1 join the task and train locally. The first next() call
    // runs a), b) and c): the round can't complete while User 1 is alone so
    // the promise stays pending in c)
    const logUser1Round1Promise = generatorUser1.next();
    // User 1 did a) and b) so their status should be Training
    expect(await statusUser1.next()).equal("local training");
    expect(await nbParticipantsUser1.next()).equal(1);
    // User 1 then reaches c) where it is ready to share its weights
    // but has to wait for more participants
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser1.next()).equal("not enough participants");

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
    const logUser2Round1Promise = generatorUser2.next();
    // User 2 connects to the server which triggers the participant event
    expect(await nbParticipantsUser2.next()).equal(2);
    // User 2 did a) and b)
    expect(await statusUser2.next()).equal("local training");
    // User 1 receives the EnoughParticipants message with the participants
    // and its previous status is restored
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );
    // User 2 finishes training and is ready to share its weights too
    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );

    /* ROUND 1 COMPLETES */

    // The server answers with the round's peers list, peers exchange their
    // updates and both pending next() calls resolve
    const logUser1Round1 = await logUser1Round1Promise;
    const logUser2Round1 = await logUser2Round1Promise;
    expect(logUser1Round1.done).to.be.false;
    expect(logUser2Round1.done).to.be.false;
    if (logUser1Round1.done || logUser2Round1.done)
      throw new Error("User 1 or 2 finished training at the 1st round");
    // User 1 finished training alone, User 2 with both present
    expect(logUser1Round1.value.participants).equal(1);
    expect(logUser2Round1.value.participants).equal(2);
    // Receiving the peers list updates the participants
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);
    expect(await statusUser1.next()).equal("connecting to peers");
    expect(await statusUser1.next()).equal("updating model");
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");

    /* ROUND 2 */

    // Both users are present so the round runs a), b) and c) to completion
    const [logUser1Round2, logUser2Round2] = await Promise.all([
      generatorUser1.next(),
      generatorUser2.next(),
    ]);
    expect(logUser1Round2.done).to.be.false;
    expect(logUser2Round2.done).to.be.false;
    if (logUser1Round2.done || logUser2Round2.done)
      throw new Error("User 1 or 2 finished training at the 2nd round");
    expect(logUser1Round2.value.participants).equal(2);
    expect(logUser2Round2.value.participants).equal(2);
    expect(await nbParticipantsUser1.next()).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);
    // User 1 and 2 did a), b) and c)
    expect(await statusUser1.next()).equal("local training");
    expect(await statusUser1.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser1.next()).equal("connecting to peers");
    expect(await statusUser1.next()).equal("updating model");

    expect(await statusUser2.next()).equal("local training");
    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");

    /* USER 1 LEAVES */

    await discoUser1.close();
    // Disconnect updates the number of participants
    expect(await nbParticipantsUser1.next()).equal(1);
    // User 2 receives the WaitingForMoreParticipants message
    expect(await nbParticipantsUser2.next()).equal(1);
    // server notifies user 2 to wait
    expect(await statusUser2.next()).equal("not enough participants");
    // Make User 2 start round 3: it trains, then waits in c) for another
    // participant, so the promise stays pending
    const logUser2Round3Promise = generatorUser2.next();
    expect(await statusUser2.next()).equal("local training");
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

    // User 3 joins mid-training and trains one local round; the round can
    // only complete once User 3 shares its update so hold the promise
    const logUser3Round1Promise = generatorUser3.next();
    expect(await nbParticipantsUser3.next()).equal(2);
    // User 3 did a) and b)
    expect(await statusUser3.next()).equal("local training");
    // User 2 receives the EnoughParticipants message and its previous
    // status is restored, waiting for user 3 to be ready to exchange weights
    expect(await nbParticipantsUser2.next()).equal(2);
    expect(await statusUser2.next()).equal(
      "waiting for peers to share weights",
    );
    // User 3 finishes training and notifies the server that they are ready
    expect(await statusUser3.next()).equal(
      "waiting for peers to share weights",
    );

    /* ROUND 3 COMPLETES */

    // user 2 and 3 exchange weight updates and both rounds resolve
    const logUser2Round3 = await logUser2Round3Promise;
    const logUser3Round1 = await logUser3Round1Promise;
    expect(logUser2Round3.done).to.be.false;
    expect(logUser3Round1.done).to.be.false;
    if (logUser2Round3.done || logUser3Round1.done)
      throw new Error("User 2 or 3 finished training at the 3rd round");

    // User 2 finished training alone, User 3 with both present
    expect(logUser2Round3.value.participants).equal(1);
    expect(logUser3Round1.value.participants).equal(2);
    expect(await nbParticipantsUser2.next()).equal(2);
    expect(await nbParticipantsUser3.next()).equal(2);

    // both user 2 and 3 finish c)
    expect(await statusUser2.next()).equal("connecting to peers");
    expect(await statusUser2.next()).equal("updating model");

    expect(await statusUser3.next()).equal("connecting to peers");
    expect(await statusUser3.next()).equal("updating model");

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
       * A call to trainByRound().next() runs a full round: a), b) and c),
       * so User 1's first round only resolves once User 2 joined and the
       * round was aggregated. The timeline is:
       * - User 1 joins the task by themselves, trains locally and waits in c)
       *   to share its weights ("not enough participants" is expected there,
       *   User 1 really is alone)
       * - User 2 joins and trains while User 1 is ready to share
       *
       * User 1 has to wait for User 2 to be ready but, once User 2 joined,
       * shouldn't be told that participants are missing: User 2 is here, only
       * still training.
       */

      /* USER 1 JOINS */

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const statusUser1 = new Queue<RoundStatus>();
      discoUser1.on("status", (status) => {
        statusUser1.put(status);
      });
      const generatorUser1 = discoUser1.trainByRound(dataset);

      // a), b) and c): User 1 trains then waits in c) until User 2 joins
      // and the round completes, so the promise stays pending
      const logUser1Round1Promise = generatorUser1.next();
      expect(await statusUser1.next()).equal("local training");
      expect(await statusUser1.next()).equal(
        "waiting for peers to share weights",
      );
      // User 1 is genuinely alone at this point
      expect(await statusUser1.next()).equal("not enough participants");

      /* USER 2 JOINS, WHILE USER 1 IS READY TO SHARE ITS WEIGHTS */

      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const statusUser2 = new Queue<RoundStatus>();
      discoUser2.on("status", (status) => {
        statusUser2.put(status);
      });
      const generatorUser2 = discoUser2.trainByRound(dataset);
      const logUser2Round1Promise = generatorUser2.next(); // a), b) and c)

      // There are enough participants now: User 1's status is restored while
      // User 2 trains. User 1 waits for User 2 to be ready but should NOT
      // report missing participants: the next status updates must be
      // "connecting to peers", without any "not enough participants"
      expect(await statusUser1.next()).equal(
        "waiting for peers to share weights",
      );
      expect(await statusUser2.next()).equal("local training");
      expect(await statusUser2.next()).equal(
        "waiting for peers to share weights",
      );

      /* USER 2 IS DONE TRAINING, PEERS EXCHANGE THEIR UPDATES */

      await Promise.all([logUser1Round1Promise, logUser2Round1Promise]);
      expect(await statusUser1.next()).equal("connecting to peers");
      expect(await statusUser1.next()).equal("updating model");
      expect(await statusUser2.next()).equal("connecting to peers");
      expect(await statusUser2.next()).equal("updating model");

      await discoUser1.close();
      await discoUser2.close();
    },
  );
});
