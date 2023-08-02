import { AggregationStep, Base as Aggregator } from './base'
import { tf, aggregation, Task, WeightsContainer, client } from '..'

import * as crypto from 'crypto'

import { Map, List, Range } from 'immutable'

/**
 * Aggregator implementing secure multi-party computation for decentralized learning.
 * An aggregation consists of two communication rounds:
 * - first, nodes communicate their secret shares to each other;
 * - then, they sum their received shares and communicate the result.
 * Finally, nodes are able to average the received partial sums to establish the aggregation result.
 */
export class SecureAggregator extends Aggregator<WeightsContainer> {
  public static readonly MAX_SEED: number = 2 ** 47

  private readonly maxShareValue: number

  constructor (
    task: Task,
    model?: tf.LayersModel
  ) {
    super(task, model, 0, 2)

    this.maxShareValue = this.task.trainingInformation.maxShareValue ?? 100
  }

  aggregate (): void {
    this.log(AggregationStep.AGGREGATE)
    if (this.communicationRound === 0) {
      // Sum the received shares
      const result = aggregation.sum(this.contributions.get(0)?.values() as Iterable<WeightsContainer>)
      this.emit(result)
    } else if (this.communicationRound === 1) {
      // Average the received partial sums
      const result = aggregation.avg(this.contributions.get(1)?.values() as Iterable<WeightsContainer>)
      this.model?.setWeights(result.weights)
      this.emit(result)
    } else {
      throw new Error('communication round is out of bounds')
    }
  }

  add (nodeId: client.NodeID, contribution: WeightsContainer, round: number, communicationRound: number): boolean {
    if (this.nodes.has(nodeId) && this.isWithinRoundCutoff(round)) {
      this.log(this.contributions.hasIn([communicationRound, nodeId]) ? AggregationStep.UPDATE : AggregationStep.ADD, nodeId)
      this.contributions = this.contributions.setIn([communicationRound, nodeId], contribution)
      this.informant?.update()
      if (this.isFull()) {
        this.aggregate()
      }
      return true
    }
    return false
  }

  isFull (): boolean {
    const contribs = this.contributions.get(this.communicationRound)
    if (contribs === undefined) {
      return false
    }
    return contribs.size === this.nodes.size
  }

  makePayloads (weights: WeightsContainer): Map<client.NodeID, WeightsContainer> {
    if (this.communicationRound === 0) {
      const shares = this.generateAllShares(weights)
      // Abitrarily assign our shares to the available nodes
      return Map(List(this.nodes).zip(shares) as List<[string, WeightsContainer]>)
    } else {
      // Send our partial sum to every other nodes
      return this.nodes.toMap().map(() => weights)
    }
  }

  /**
   * Generate N additive shares that aggregate to the secret weights array, where N is the number of peers.
   */
  public generateAllShares (secret: WeightsContainer): List<WeightsContainer> {
    if (this.nodes.size === 0) {
      throw new Error('too few participants to generate shares')
    }
    // Generate N-1 shares
    const shares = Range(0, this.nodes.size - 1)
      .map(() => this.generateRandomShare(secret))
      .toList()
    // The last share completes the sum
    return shares.push(secret.sub(aggregation.sum(shares)))
  }

  /**
   * Generates one share in the same shape as the secret that is populated with values randomly chosen from
   * a uniform distribution between (-maxShareValue, maxShareValue).
   */
  public generateRandomShare (secret: WeightsContainer): WeightsContainer {
    const seed = crypto.randomInt(SecureAggregator.MAX_SEED)
    return secret.map((t) =>
      tf.randomUniform(t.shape, -this.maxShareValue, this.maxShareValue, 'float32', seed))
  }
}
