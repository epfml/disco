import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { TensorLike } from './weights_container.js'
import { WeightsContainer } from './weights_container.js'

type WeightsLike = Iterable<TensorLike>

function parseWeights (weights: Iterable<WeightsLike | WeightsContainer>): List<WeightsContainer> {
  const r = List(weights).map((w) =>
    w instanceof WeightsContainer ? w : new WeightsContainer(w))
  const size = r.first()?.weights.length

  if (size === undefined) {
    throw new Error('no weights to work with')
  }
  r.rest().forEach((w) => {
    const actual = w.weights.length
    if (actual !== size) {
      throw new Error(`weights dimensions are different for some of the operands: expected ${size} but found ${actual}`)
    }
  })

  return r
}

function reduce (
  weights: Iterable<WeightsLike | WeightsContainer>,
  fn: (a: tf.Tensor, b: tf.Tensor) => tf.Tensor
): WeightsContainer {
  return parseWeights(weights).reduce((acc: WeightsContainer, ws: WeightsContainer) =>
    acc.mapWith(ws, fn))
}

/**
 * Sums the given iterable of weights entry-wise.
 * @param weights The list of weights to sum
 * @returns The summed weights
 */
export function sum (weights: Iterable<WeightsLike | WeightsContainer>): WeightsContainer {
  return reduce(weights, tf.add)
}

/**
 * Computes the successive entry-wise difference between the weights of the given iterable.
 * The operation is not commutative w.r.t. the iterable's ordering.
 */
export function diff (weights: Iterable<WeightsLike | WeightsContainer>): WeightsContainer {
  return reduce(weights, tf.sub)
}

/**
 * Averages the given iterable of weights entry-wise.
 * @param weights The list of weights to average
 * @returns The averaged weights
 */
export function avg (weights: Iterable<WeightsLike | WeightsContainer>): WeightsContainer {
  const ws = List(weights)
  return sum(ws).map((w) => w.div(ws.size))
}
