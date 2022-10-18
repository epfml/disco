import { List } from 'immutable'
import { assert } from 'chai'

import { tf } from '..'
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

function centerWeights (weights: Iterable<WeightsLike | WeightsContainer>, currentModel: WeightsContainer): List<WeightsContainer> {
  return parseWeights(weights).map(model => model.mapWith(currentModel, tf.sub))
}

function clipWeights (modelList: List<WeightsContainer>, normArray: number[], tau: number): List<WeightsContainer> {
  return modelList.map(weights => weights.mapWithIndex((w, i) => tf.prod(w, Math.min(1, tau / (normArray[i])))))
}

function computeQuantile (array: number[], q: number): number {
  const sorted = array.sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  } else {
    return sorted[base]
  }
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

// See: https://arxiv.org/abs/2012.10333
export function avgClippingWeights (peersWeights: Iterable<WeightsLike | WeightsContainer>, currentModel: WeightsContainer, tauPercentile: number): WeightsContainer {
  // Computing the centered peers weights with respect to the previous model aggragation
  const centeredPeersWeights: List<WeightsContainer> = centerWeights(peersWeights, currentModel)

  // Computing the Matrix Norm (Frobenius Norm) of the centered peers weights
  const normArray: number[] = Array.from(centeredPeersWeights.map(model => model.frobeniusNorm()))

  // Computing the parameter tau as third percentile with respect to the norm array
  const tau: number = computeQuantile(normArray, tauPercentile)

  // Computing the centered clipped peers weights given the norm array and the parameter tau
  const centeredMean: List<WeightsContainer> = clipWeights(centeredPeersWeights, normArray, tau)

  // Aggregating all centered clipped peers weights
  return avg(centeredMean)
}

// TODO: implement equal in WeightsContainer
export function assertWeightsEqual (w1: WeightsContainer, w2: WeightsContainer, epsilon: number = 0): void {
  // Inefficient because we wait for each layer to completely load before we start loading the next layer
  // when using tf.Tensor.dataSync() in a for loop. Could be made more efficient by using Promise.all().
  // Not worth making more efficient, because this function is only used for testing, where tf.Tensors are small.
  for (const t of w1.sub(w2).weights) {
    assert.strictEqual(
      tf.lessEqual(t.abs(), epsilon).all().dataSync()[0],
      1
    )
  }
}
