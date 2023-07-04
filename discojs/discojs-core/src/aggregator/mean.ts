import { Map } from 'immutable'

import { AggregationStep, Base as Aggregator } from './base'
import { Task, WeightsContainer, aggregation, tf, client } from '..'

/**
 * Aggregator that computes the mean of the weights received from the nodes.
 */
export class MeanAggregator extends Aggregator<WeightsContainer> {
  public readonly threshold: number

  constructor (
    task: Task,
    model?: tf.LayersModel,
    roundCutoff = 0,
    threshold = 1
  ) {
    super(task, model, roundCutoff, 1)

    if (threshold === undefined) {
      this.threshold = 1
    } else if (threshold <= 0) {
      throw new Error('threshold must be positive')
    } else if (threshold > 1 && Math.round(threshold) !== threshold) {
      throw new Error('absolute thresholds must integers')
    } else {
      this.threshold = threshold
    }
  }

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
