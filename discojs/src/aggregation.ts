import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'

import { Weights } from './types'
import { computeQuantile, frobeniusNorm } from './utility'

// Private functions
function checkWeights (peersWeights: List<Weights>): boolean {
  const firstWeightSize = peersWeights.first()?.length

  return firstWeightSize !== undefined && peersWeights.rest().every((ws) => ws.length === firstWeightSize)
}

function clipWeights (modelList: List<Weights>, normArray: number[], tau: number): List<Weights> {
  return modelList.map(weights => weights.map((w, i) => tf.prod(w, Math.min(1, tau / (normArray[i])))))
}

function applyArithmeticToWeights (peersWeights: List<Weights>, tfjsArithmeticFunction: (arg1: tf.Tensor, arg2: tf.Tensor) => tf.Tensor): Weights {
  console.log('Aggregating a list of', peersWeights.size, 'weight vectors.')

  if (!checkWeights(peersWeights)) {
    throw new Error('peersWeights are not valid')
  }

  const peersAverageWeights = peersWeights.reduce((accum: Weights, weights) => {
    return accum.map((w, i) => tfjsArithmeticFunction(w, weights[i]))
  })

  return peersAverageWeights
}

function applyArithmeticToWeightsAndModel (peersWeights: List<Weights>, model: Weights, tfjsArithmeticFunction: (arg1: tf.Tensor, arg2: tf.Tensor) => tf.Tensor): List<Weights> {
  console.log('Computing operation between weights and previous aggregated model')

  if (!checkWeights(peersWeights)) {
    throw new Error('peersWeights are not valid')
  }

  return peersWeights.map(weights =>
    List(weights)
      .zip(List(model))
      .map(([w1, w2]) => tfjsArithmeticFunction(w1, w2)))
    .map(element => Array.from(element))
}

// Public functions for aggregating weights

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

// See: https://arxiv.org/abs/2012.10333
export function averageCenteredClippingWeights (peersWeights: List<Weights>, currentModel: Weights): Weights {
  // Computing the centered peers weights with respect to the previous model aggragation
  const centeredPeersWeights: List<Weights> = applyArithmeticToWeightsAndModel(peersWeights, currentModel, tf.sub)

  // Computing the Matrix Norm (Frobenius Norm) of the centered peers weights
  const normArray: number[] = Array.from(centeredPeersWeights.map(model => frobeniusNorm(model)))

  // Computing the parameter tau as third percentile with respect to the norm array
  const tau: number = computeQuantile(normArray, 0.75)

  // Computing the centered clipped peers weights given the norm array and the parameter tau
  const centeredMean: List<Weights> = clipWeights(centeredPeersWeights, normArray, tau)

  // Aggregating all centered clipped peers weights
  return averageWeights(centeredMean.map(weights => Array.from(weights)))
}
