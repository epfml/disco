import { List } from 'immutable'

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
  return parseWeights(weights).map(model => model.sub(currentModel))
}

function clipWeights (modelList: List<WeightsContainer>, normArray: number[], tau: number): List<WeightsContainer> {
  return modelList.map((weights, i) => weights.mul(tf.scalar(Math.min(1, tau / (normArray[i])))))
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

// Note this aggregation functions returns the new gradient, so it is necessary to keep track of globalMomentum and to update the currentModel adding the globalMomentum
// See: https://arxiv.org/abs/2012.10333
export function avgClippingWeights (peersMomentum: Iterable<WeightsLike | WeightsContainer>, globalMomentum: WeightsContainer, tauPercentile: number): WeightsContainer {
  // Computing the centered peers momentum with respect to the global momentum
  const centeredPeersMomentum: List<WeightsContainer> = centerWeights(peersMomentum, globalMomentum)
  // console.log(centeredPeersMomentum.toArray().map(weights => weights.weights.map(w => w.flatten().arraySync())))

  // Computing the Matrix Norm (Frobenius Norm) of the centered peers momentum
  const normArray: number[] = Array.from(centeredPeersMomentum.map(model => model.frobeniusNorm()))
  console.log(normArray)

  // Computing the parameter tau as third percentile with respect to the norm array
  const tau: number = computeQuantile(normArray, tauPercentile)
  console.log(tau)

  // Computing the centered clipped peers momentum given the norm array and the parameter tau
  const clippedPeersMomentum: List<WeightsContainer> = clipWeights(centeredPeersMomentum, normArray, tau)
  // console.log(clippedPeersMomentum.toArray().map(weights => weights.weights.map(w => w.flatten().arraySync())))

  // Aggregating all centered clipped peers momentum
  return avg(clippedPeersMomentum.map(weights => weights.add(globalMomentum)))
}
