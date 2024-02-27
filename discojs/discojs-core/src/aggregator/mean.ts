import { type Map } from 'immutable'

import { AggregationStep, Base as Aggregator } from './base'
import { type Task, type WeightsContainer, aggregation, type tf, type client } from '..'

/**
 * Mean aggregator whose aggregation step consists in computing the mean of the received weights.
 */
export class MeanAggregator extends Aggregator<WeightsContainer> {
  /**
   * The threshold t to fulfill to trigger an aggregation step. It can either be:
   * - relative: 0 < t <= 1, thus requiring t * |nodes| contributions
   * - absolute: t > 1, thus requiring t contributions
   */
  public readonly threshold: number

  constructor (
    task: Task,
    model?: tf.LayersModel,
    roundCutoff = 0,
    threshold = 1
  ) {
    super(task, model, roundCutoff, 1)

    // Default threshold is 100% of node participation
    if (threshold === undefined) {
      this.threshold = 1
    // Threshold must be positive
    } else if (threshold <= 0) {
      throw new Error('threshold must be positive')
    // Thresholds greater than 1 are considered absolute instead of relative to the number of nodes
    } else if (threshold > 1 && Math.round(threshold) !== threshold) {
      throw new Error('absolute thresholds must integers')
    } else {
      this.threshold = threshold
    }
  }

  /**
   * Checks whether the contributions buffer is full, according to the set threshold.
   * @returns Whether the contributions buffer is full
   */
  isFull (): boolean {
    if (this.threshold <= 1) {
      const contribs = this.contributions.get(this.communicationRound)
      if (contribs === undefined) {
        return false
      }
      return contribs.size >= this.threshold * this.nodes.size
    }
    return this.contributions.size >= this.threshold
  }

  add (nodeId: client.NodeID, contribution: WeightsContainer, round: number): boolean {
    if (this.nodes.has(nodeId) && this.isWithinRoundCutoff(round)) {
      this.log(this.contributions.hasIn([0, nodeId]) ? AggregationStep.UPDATE : AggregationStep.ADD, nodeId)
      this.contributions = this.contributions.setIn([0, nodeId], contribution)
      this.informant?.update()
      if (this.isFull()) {
        this.aggregate()
      }
      return true
    }
    return false
  }

  aggregate (): void {
    this.log(AggregationStep.AGGREGATE)
    const result = aggregation.avg(this.contributions.get(0)?.values() as Iterable<WeightsContainer>)
    this.model?.setWeights(result.weights)
    this.emit(result)
  }

  makePayloads (weights: WeightsContainer): Map<client.NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights)
  }
}
