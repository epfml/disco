import { Set } from 'immutable'

import { Weights } from './types'

export function averageWeights (peersWeights: Set<Weights>): Weights {
  console.log('Aggregating a set of', peersWeights.size, 'weights.')
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

  return peersAverageWeights
}
