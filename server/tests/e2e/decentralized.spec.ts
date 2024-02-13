import type { Server } from 'node:http'
import { List } from 'immutable'
import { assert } from 'chai'

import {
  aggregator as aggregators, informant as informants, client as clients, type Task, WeightsContainer, defaultTasks, aggregation
} from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'

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

type MockAggregator = MockMeanAggregator | MockSecureAggregator

describe('end-to-end decentralized', function () {
  const epsilon = 1e-4
  this.timeout(30_000)

  let server: Server
  beforeEach(async () => {
    server = await startServer()
  })
  afterEach(() => {
    server?.close()
  })

  /**
   * Makes client object to connect to server. The input array is the weights that the client will share
   * with other ready peers. The input will vary with model architecture and training data. If secure is true,
   * the client will implement secure aggregation. If it is false, it will be a clear text client.
   */
  async function simulateClient (
    Aggregator: new (task: Task) => MockAggregator,
    input: number[],
    rounds: number
  ): Promise<[WeightsContainer, clients.Client]> {
    const task = defaultTasks.cifar10.getTask()
    const inputWeights = WeightsContainer.of(input)
    const aggregator = new Aggregator(task)

    const informant = new informants.DecentralizedInformant(task)
    const client = await getClient(clients.decentralized.DecentralizedClient, server, task, aggregator)

    aggregator.outcome = inputWeights

    await client.connect()

    await client.onTrainBeginCommunication(aggregator.outcome, informant)
    // Perform multiple training rounds
    for (let r = 0; r < rounds; r++) {
      await client.onRoundBeginCommunication(aggregator.outcome, aggregator.round, informant)
      await new Promise((resolve) => {
        setTimeout(resolve, 1_000)
      })
      await client.onRoundEndCommunication(aggregator.outcome, aggregator.round, informant)
    }
    await client.onTrainEndCommunication(aggregator.outcome, informant)

    return [aggregator.outcome, client]
  }

  /**
   * Creates three clients with different update values and returns the aggregated update value between all three clients.
   * The clients have model dimension of 4 model updates to share, which can be seen as their input parameter in makeClient.
   */
  async function reachConsensus (
    Aggregator: new (task: Task) => MockAggregator,
    rounds = 1
  ): Promise<void> {
    // Expect the clients to reach the mean consensus, for both the mean and secure aggregators
    const expected = WeightsContainer.of([0.002, 7, 27, 11])
    const contributions = List.of(
      [0.001, 3, 40, 10],
      [0.002, 5, 30, 11],
      [0.003, 13, 11, 12]
    )
    const actual = await Promise.all(contributions.map(async (w) => await simulateClient(Aggregator, w, rounds)).toArray())
    const consensuses = await Promise.all(actual.map(async ([consensus, client]) => {
      // Disconnect clients once they reached consensus
      await client.disconnect()
      return consensus
    }))
    assert.isTrue(consensuses.every((consensus) => consensus.equals(expected, epsilon)))
  }

  it('single round of cifar 10 with three mean aggregators yields consensus', async () => {
    await reachConsensus(MockMeanAggregator)
  })

  it('several rounds of cifar 10 with three mean aggregators yields consensus', async () => {
    await reachConsensus(MockMeanAggregator, 3)
  })

  it('single round of cifar 10 with three secure aggregators yields consensus', async () => {
    await reachConsensus(MockSecureAggregator)
  })

  it('several rounds of cifar 10 with three secure aggregators yields consensus', async () => {
    await reachConsensus(MockSecureAggregator, 3)
  })
})
