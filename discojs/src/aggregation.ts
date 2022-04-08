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

  return peersWeights.map((peerWeights) =>
    tf.layers.average().apply(peerWeights) as tf.Tensor // TODO do not cast
  ).toArray()
}
