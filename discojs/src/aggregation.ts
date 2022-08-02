import { List } from 'immutable'

import { Weights } from './types'

export function sumWeights (peersWeights: List<Weights>): Weights {
  console.log('Aggregating a list of', peersWeights.size, 'weight vectors.')
  const firstWeightSize = peersWeights.first()?.length
  if (firstWeightSize === undefined) {
    throw new Error('no weights to average')
  }
  if (!peersWeights.rest().every((ws) => ws.length === firstWeightSize)) {
    throw new Error('weights dimensions are different for some of the summands')
  }

  const peersAverageWeights = peersWeights.reduce((accum: Weights, weights) => {
    return accum.map((w, i) => w.add(weights[i]))
  })

  return peersAverageWeights
}

export function averageWeights (peersWeights: List<Weights>): Weights {
  const numberOfPeers = peersWeights.size
  return sumWeights(peersWeights).map((w) => w.div(numberOfPeers))
}