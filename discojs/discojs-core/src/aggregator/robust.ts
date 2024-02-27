import { Base as Aggregator } from './base'
import { type client, type WeightsContainer } from '..'

import { type Map } from 'immutable'

export type Momentum = WeightsContainer

// TODO @s314cy: store previous round contributions + be able to access own previous contribution
// for computing the momentum
export class RobustAggregator extends Aggregator<WeightsContainer> {
  // TODO @s314y: move to task definition
  private readonly beta = 1

  add (nodeId: client.NodeID, contribution: WeightsContainer, round: number, communicationRound: number): boolean {
    if (this.isWithinRoundCutoff(round)) {
      const stale = this.contributions.get(communicationRound)
      if (stale !== undefined) {
        // this.momentums = this.momentums.set(nodeId, this.computeMomentum(stale, contribution))
      } else {
        //
      }
      this.contributions = this.contributions.setIn([nodeId, communicationRound], contribution)
      this.aggregate()
      return true
    }
    return false
  }

  aggregate (): void {
    if (this.task.trainingInformation.tauPercentile === undefined) {
      throw new Error('task doesn\'t provide tau percentile')
    }
    // this.emit(aggregation.avgClippingWeights(
    //   this.contributions.values(),
    //   undefined as unknown as WeightsContainer,
    //   this.task.trainingInformation.tauPercentile
    // ))
  }

  makePayloads (weights: WeightsContainer): Map<client.NodeID, WeightsContainer> {
    return undefined as any
  }

  isFull (): boolean {
    return true
  }

  private computeMomentum (a: WeightsContainer, b: WeightsContainer): WeightsContainer {
    return a.sub(b).mul(1 - this.beta).add(a.mul(this.beta))
  }
}
