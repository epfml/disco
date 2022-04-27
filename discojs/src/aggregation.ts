import { Set } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { Weights } from './types'

export function averageWeights (peersWeights: Set<Weights>): Weights {
  const firstWeightSize = peersWeights.first()?.length
  if (firstWeightSize === undefined) {
    throw new Error('no weights to average')
  }
  if (!peersWeights.rest().every((ws) => ws.length === firstWeightSize)) {
    throw new Error('variable weights size')
  }

  const numberOfPeers = peersWeights.size

  const peersAverageWeights = peersWeights.reduce((accum: Weights, weights) => {
    return accum.map((w, i) => w.add(weights[i]))
  }).map((w) => w.div(numberOfPeers))

  return peersAverageWeights//peersWeights.first() // TODO average
}
