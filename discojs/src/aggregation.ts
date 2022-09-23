import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'

import { Weights } from './types'

function applyArithmeticToWeights (peersWeights: List<Weights>, tfjsArithmeticFunction: (arg1: tf.Tensor, arg2: tf.Tensor) => tf.Tensor): Weights {
  console.log('Aggregating a list of', peersWeights.size, 'weight vectors.')
  const firstWeightSize = peersWeights.first()?.length
  if (firstWeightSize === undefined) {
    throw new Error('no weights to average')
  }
  if (!peersWeights.rest().every((ws) => ws.length === firstWeightSize)) {
    throw new Error('weights dimensions are different for some of the summands')
  }

  const peersAverageWeights = peersWeights.reduce((accum: Weights, weights) => {
    return accum.map((w, i) => tfjsArithmeticFunction(w, weights[i]))
  })

  return peersAverageWeights
}

export function sumWeights (peersWeights: List<Weights>): Weights {
  return applyArithmeticToWeights(peersWeights, tf.add)
}

export function subtractWeights (peersWeights: List<Weights>): Weights {
  return applyArithmeticToWeights(peersWeights, tf.sub)
}

export function averageWeights (peersWeights: List<Weights>): Weights {
  const numberOfPeers = peersWeights.size
  return sumWeights(peersWeights).map((w) => w.div(numberOfPeers))
}

// Implementation of: https://arxiv.org/abs/2012.10333
export function averageCenteredClipping (peersWeights: List<Weights>, previousWeights: Weights, tau: number): Weights {
  // It computes the difference between the current and the previous weights
  const weightsDiff: List<List<tf.Tensor>> = peersWeights.map(weights => List(weights).zip(List(previousWeights)).map(([w1, w2]) => w1.sub(w2)))

  // It computes the Frobenius norm of the difference between current and previous weights
  const norm: List<number> = weightsDiff.map(weights => Math.sqrt(weights.map((w) => w.square().sum().dataSync()[0]).reduce((a: number, b) => a + b)))

  // It computes the centered clipped quantity for each weight, clipping tau/norm(i) at 1.
  const centeredMean: List<List<tf.Tensor>> = weightsDiff.map(weights => weights.map((w, i) => tf.prod(w, Math.min(1, tau / (norm.get(i) ?? 1)))))

  // It aggregates weights using the centered clipped quantities
  return averageWeights(centeredMean.map(weights => Array.from(weights)))
}
