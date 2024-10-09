import type * as http from 'node:http'
import { List, Repeat } from 'immutable'
import { expect } from 'chai'
import path from "node:path";

import type { RoundLogs, RoundStatus } from "@epfml/discojs";
import { loadImagesInDir } from "@epfml/discojs-node";
import { Queue } from './utils.js'

import {
  aggregator as aggregators,
  client as clients,
  defaultTasks,
  Disco,
  WeightsContainer,
} from "@epfml/discojs";

import { Server } from '../../src/index.js'

async function WSIntoList(ws: WeightsContainer): Promise<List<List<number>>> {
  return List((await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
    (arr) => List(arr),
  ));
}

async function expectWSToBeClose(
  left: WeightsContainer,
  right: WeightsContainer,
): Promise<void> {
  (await WSIntoList(left))
    .zip(await WSIntoList(right))
    .forEach((tensors) =>
      tensors[0]
        .zip(tensors[1])
        .forEach(([l, r]) => expect(l).to.be.closeTo(r, 1e-4)),
    );
}

describe('end-to-end decentralized', function () {
  this.timeout(30_000)

  let server: http.Server
  let url: URL
  beforeEach(async () => {
    const disco = await Server.of(defaultTasks.cifar10, defaultTasks.lusCovid);
    [server, url] = await disco.serve();
  });
  afterEach(() => { server?.close() })

  /**
   * Makes client object to connect to server. The input array is the weights that the client will share
   * with other ready peers. The input will vary with model architecture and training data. If secure is true,
   * the client will implement secure aggregation. If it is false, it will be a clear text client.
   */
  async function simulateClient (
    aggregatorType: 'mean' | 'secure',
    input: number[],
    rounds: number
  ): Promise<[WeightsContainer, clients.Client]> {
    const task = defaultTasks.cifar10.getTask()
    const aggregator = aggregatorType == 'mean' ? 
      new aggregators.MeanAggregator(0, 1, 'relative')
      : new aggregators.SecureAggregator()

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
    aggregatorType: 'mean' | 'secure',
    rounds = 1
  ): Promise<void> {
    // Expect the clients to reach the mean consensus, for both the mean and secure aggregators
    const contributions = List.of(
      [0.001, 3, 40, 10],
      [0.002, 5, 30, 11],
      [0.003, 13, 11, 12]
    )
    const actual = await Promise.all(contributions.map(async (w) => await simulateClient(aggregatorType, w, rounds)).toArray())
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

  it('single round of cifar 10 with three mean aggregators yields consensus', async () => {
    await reachConsensus('mean')
  })

  it('several rounds of cifar 10 with three mean aggregators yields consensus', async () => {
    await reachConsensus('mean', 3)
  })

  it('single round of cifar 10 with three secure aggregators yields consensus', async () => {
    await reachConsensus('secure')
  })

  it('several rounds of cifar 10 with three secure aggregators yields consensus', async () => {
    await reachConsensus('secure', 3)
  })

  it("peers emit expected statuses", async function () {
    this.timeout(15_000);
    const lusCovidTask = defaultTasks.lusCovid.getTask();
    lusCovidTask.trainingInformation.aggregationStrategy = 'mean';
    lusCovidTask.trainingInformation.epochs = 8;
    lusCovidTask.trainingInformation.roundDuration = 2;
    lusCovidTask.trainingInformation.minNbOfParticipants = 2;

    const DATASET_DIR = path.join("..", "datasets");

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
     * Then at each round (each call to `disco.trainByRound`) the event cycle is:
     * a) During onRoundBeingCommunication, 
     *   1. the peer notifies the server that they want to join the next round
     *   2. finishes by updating the status to TRAINING
     * (without waiting for a server answer)
     * b) local training (the status remains TRAINING)
     * c) During onRoundEndCommunication 
     *   1. the peer notifies the server that they are ready to share weights 
     *      set status to RETRIEVING PEERS
     *   2. wait for the server to answer with the current round's peers list
     *      this is where the nb of participants is updated
     *   3. establish peer-to-peer connections 
     *   4. set status to UPDATING MODEL and exchange weight updates
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
    const statusUpdateTime = 500 // allow some time for the client to update their status

    // Create User 1
    const discoUser1 = new Disco(lusCovidTask, url, { });
    const statusUser1 = new Queue<RoundStatus>();
    discoUser1.on("status", status => { statusUser1.put(status) })
    const generatorUser1 = discoUser1.trainByRound(["image", dataset])
    
    // Have User 1 join the task and train locally for one round
    const logUser1Round1 = await generatorUser1.next()
    expect(logUser1Round1.done).to.be.false
    // User 1 did a) and b) so their status should be Training
    expect(await statusUser1.next()).equal("local training")
    if (logUser1Round1.done)
      throw Error("User 1 finished training at the 1st round")
    // participant list not updated yet (updated at step c))
    expect((logUser1Round1.value).participants).equal(1)

    // Calling next() a 2nd time makes User 1 go to c) where the peer should
    // stay stuck awaiting until another participant joins
    const logUser1Round2Promise = generatorUser1.next()
    await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    expect(await statusUser1.next()).equal("connecting to peers") // tries to connect to peers
    expect(await statusUser1.next()).equal("not enough participants") // but has to wait for more participants

    // Create User 2
    const discoUser2 = new Disco(lusCovidTask, url, { });
    const statusUser2 = new Queue<RoundStatus>();
    discoUser2.on("status", status => { statusUser2.put(status) })
    const generatorUser2 = discoUser2.trainByRound(["image", dataset])

    // Have User 2 join the task and train for one round
    const logUser2Round1 = await generatorUser2.next()
    expect(logUser2Round1.done).to.be.false
    // participant list not updated yet (updated at step c))
    expect((logUser2Round1.value as RoundLogs).participants).equal(1)
    // User 2 did a) and b)
    expect(await statusUser2.next()).equal("local training")
    // User 1 is still in c) now waiting for user 2 to be ready to exchange weight updates
    expect(await statusUser1.next()).equal("connecting to peers")

    // Proceed with round 2
    // The server should answer with the round's peers list. 
    // Peers then exchange updates and then start training locally with the new weights
    const logUser2Round2 = await generatorUser2.next()
    const logUser1Round2 = await logUser1Round2Promise // the promise can resolve now
    expect(logUser1Round2.done).to.be.false
    expect(logUser2Round2.done).to.be.false
    // nb of participants should now be updated
    expect((logUser1Round2.value as RoundLogs).participants).equal(2)
    expect((logUser2Round2.value as RoundLogs).participants).equal(2)
    // User 1 and 2 did c), a) and b)
    expect(await statusUser1.next()).equal("updating model") // second to last
    expect(await statusUser1.next()).equal("local training")

    expect(await statusUser2.next()).equal("connecting to peers") // back to connecting when user 1 joins
    expect(await statusUser2.next()).equal("updating model")
    expect(await statusUser2.next()).equal("local training")
    
    // Have user 1 quit the session
    await discoUser1.close()
    // Make user 2 go to c)
    const logUser2Round3Promise = generatorUser2.next()
    await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    expect(await statusUser2.next()).equal("connecting to peers")
    expect(await statusUser2.next()).equal("not enough participants")

    // Create User 3
    const discoUser3 = new Disco(lusCovidTask, url, { });
    const statusUser3 = new Queue<RoundStatus>();
    discoUser3.on("status", status => { statusUser3.put(status) })
    const generatorUser3 = discoUser3.trainByRound(["image", dataset])

    // User 3 joins mid-training and trains one local round
    const logUser3Round1 = await generatorUser3.next()
    expect(logUser3Round1.done).to.be.false
    // participant list not updated yet
    expect((logUser3Round1.value as RoundLogs).participants).equal(1)
    // User 3 did a) and b)
    expect(await statusUser3.next()).equal("local training")
    // User 2 is still in c) waiting for user 3 to be ready to exchange waits
    expect(await statusUser2.next()).equal("connecting to peers")
    
    // User 3 notifies the server that they are ready to exchange waits
    // then user 2 and 3 exchange weight updates
    const logUser3Round3 = await generatorUser3.next()
    const logUser2Round3 = await logUser2Round3Promise // the promise can resolve now
    if (logUser3Round3.done || logUser2Round3.done)
      throw Error("User 1 or 2 finished training at the 3nd round")
    expect(logUser2Round3.value.participants).equal(2)
    expect(logUser3Round3.value.participants).equal(2)
    // both user 2 and 3 did c), a) and are now in b)
    expect(await statusUser2.next()).equal("updating model")
    expect(await statusUser2.next()).equal("local training")

    expect(await statusUser3.next()).equal("connecting to peers")
    expect(await statusUser3.next()).equal("updating model")
    expect(await statusUser3.next()).equal("local training")
    
    await discoUser2.close()
    await new Promise((res, _) => setTimeout(res, statusUpdateTime)) // Wait some time for the status to update
    expect(await statusUser3.next()).equal("not enough participants")
    await discoUser3.close()
  });
})
