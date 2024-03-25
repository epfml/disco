// TODO remove as nothing is implemented

import { Base as Aggregator } from './base.js'
import type { client, Model, WeightsContainer } from '../index.js'

import type { Map } from 'immutable'

export type Momentum = WeightsContainer

// TODO @s314cy: store previous round contributions + be able to access own previous contribution
// for computing the momentum
export class RobustAggregator extends Aggregator<WeightsContainer> {
  constructor (
    _tauPercentile: number,
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

  override aggregate (): void {
    throw new Error('not implemented')
  }

  override makePayloads (): Map<client.NodeID, WeightsContainer> {
    throw new Error('not implemented')
  }

  isFull (): boolean {
    return true
  }
}
