import { Base as Aggregator } from './base'
import type { client, Model, WeightsContainer } from '..'

import type { Map } from 'immutable'

export type Momentum = WeightsContainer

// TODO @s314cy: store previous round contributions + be able to access own previous contribution
// for computing the momentum
export class RobustAggregator extends Aggregator<WeightsContainer> {
  // TODO @s314y: move to task definition
  private readonly beta = 1

  constructor (
    private readonly tauPercentile: number,
    model?: Model,
    roundCutoff?: number,
    communicationRounds?: number
  ) {
    super(model, roundCutoff, communicationRounds)
  }

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
    throw new Error('not implemented')
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
