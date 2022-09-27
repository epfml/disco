import { List } from 'immutable'
import { assert } from 'chai'

import { tf, Weights } from '..'
import { TensorLike, WeightsContainer } from './weights_container'

type WeightsLike = Iterable<TensorLike>

function parseWeights (weights: Iterable<WeightsLike | WeightsContainer>): List<WeightsContainer> {
  const r = List(weights).map((w) =>
    w instanceof WeightsContainer ? w : new WeightsContainer(w))
  const weightsSize = r.first()?.weights.length

  if (weightsSize === undefined) {
    throw new Error('no weights to work with')
  }
  if (r.rest().every((w) => w.weights.length !== weightsSize)) {
    throw new Error('weights dimensions are different for some of the operands')
  }

  return r
}

function reduce (
  weights: Iterable<WeightsLike | WeightsContainer>,
  fn: (a: tf.Tensor, b: tf.Tensor) => tf.Tensor
): WeightsContainer {
  return parseWeights(weights).reduce((acc: WeightsContainer, ws: WeightsContainer) =>
    new WeightsContainer(acc.weights.map((w, i) =>
      fn(w, ws.get(i) as tf.Tensor))))
}

export function sum (weights: Iterable<WeightsLike | WeightsContainer>): WeightsContainer {
  return reduce(weights, tf.add)
}

export function diff (weights: Iterable<WeightsLike | WeightsContainer>): WeightsContainer {
  return reduce(weights, tf.sub)
}

export function avg (weights: Iterable<WeightsLike | WeightsContainer>): WeightsContainer {
  const size = List(weights).size
  return sum(weights).map((ws) => ws.div(size))
}

// TODO: implement equal in WeightsContainer
export function assertWeightsEqual (w1: Weights, w2: Weights, epsilon: number = 0): void {
  const differenceBetweenWeights: Weights = WeightsContainer.sub(w1, w2).weights
  // Inefficient because we wait for each layer to completely load before we start loading the next layer
  // when using tf.Tensor.dataSync() in a for loop. Could be made more efficient by using Promise.all().
  // Not worth making more efficient, because this function is only used for testing, where tf.Tensors are small.
  for (const t of differenceBetweenWeights) {
    assert.strictEqual(
      tf.lessEqual(t.abs(), epsilon).all().dataSync()[0],
      1
    )
  }
}
