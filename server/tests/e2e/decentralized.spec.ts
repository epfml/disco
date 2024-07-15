import type { Server } from 'node:http'
import { List } from 'immutable'
import { expect } from 'chai'

import {
  aggregator as aggregators, client as clients, WeightsContainer, defaultTasks, aggregation
} from '@epfml/discojs'

import { startServer } from '../../src/index.js'

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

// Mocked aggregators with easy-to-fetch aggregation results
class MockMeanAggregator extends aggregators.MeanAggregator {
  public outcome?: WeightsContainer

  aggregate (): void {
    this.log(aggregators.AggregationStep.AGGREGATE)
    const result = aggregation.avg(this.contributions.get(0)?.values() as Iterable<WeightsContainer>)
    this.emit(result)
    this.outcome = result
  }

  add (nodeId: clients.NodeID, contribution: WeightsContainer, round: number): boolean {
    if (round > this.round) {
      throw new Error('received contribution is too recent')
    }
    return super.add(nodeId, contribution, round)
  }
}

class MockSecureAggregator extends aggregators.SecureAggregator {
  public outcome?: WeightsContainer
  public id?: string

  aggregate (): void {
    this.log(aggregators.AggregationStep.AGGREGATE)
    if (this.communicationRound === 0) {
      // Sum the received shares
      const result = aggregation.sum(this.contributions.get(0)?.values() as Iterable<WeightsContainer>)
      this.emit(result)
    } else if (this.communicationRound === 1) {
      // Average the received partial sums
      const result = aggregation.avg(this.contributions.get(1)?.values() as Iterable<WeightsContainer>)
      this.emit(result)
      this.outcome = result
    } else {
      throw new Error('communication round out of bounds')
    }
  }

  add (nodeId: clients.NodeID, contribution: WeightsContainer, round: number, communicationRound: number): boolean {
    if (round > this.round) {
      throw new Error('received contribution is too recent')
    }
    return super.add(nodeId, contribution, round, communicationRound)
  }
}

describe('end-to-end decentralized', function () {
  this.timeout(30_000)

  let server: Server
  let url: URL
  beforeEach(async () => { [server, url] = await startServer() })
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
    const inputWeights = WeightsContainer.of(input)
    const aggregator = aggregatorType == 'mean' ? 
      new MockMeanAggregator(undefined, undefined, 1, 'relative')
      : new MockSecureAggregator()

    const client = new clients.decentralized.DecentralizedClient(url, task, aggregator)

    aggregator.outcome = inputWeights

    await client.connect()

    // Perform multiple training rounds
    for (let r = 0; r < rounds; r++) {
      await client.onRoundBeginCommunication(aggregator.outcome, aggregator.round)
      await new Promise((resolve) => {
        setTimeout(resolve, 1_000)
      })
      await client.onRoundEndCommunication(aggregator.outcome, aggregator.round)
    }

    return [aggregator.outcome, client]
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
})
