import { List } from 'immutable'

import { tf } from '..'
import { type TensorLike, WeightsContainer } from './weights_container'

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

// function centerWeights (models: Iterable<WeightsLike | WeightsContainer>, own: WeightsContainer): List<WeightsContainer> {
//   return parseWeights(models).map((model) => model.mapWith(own, tf.sub))
// }

// function clipWeights (modelList: List<WeightsContainer>, normArray: number[], tau: number): List<WeightsContainer> {
//   return modelList.map((weights, i) => weights.mul(tf.scalar(Math.min(1, tau / (normArray[i])))))
// }

// function computeQuantile (array: number[], q: number): number {
//   const sorted = array.sort((a, b) => a - b)
//   const pos = (sorted.length - 1) * q
//   const base = Math.floor(pos)
//   const rest = pos - base
//   if (sorted[base + 1] !== undefined) {
//     return sorted[base] + rest * (sorted[base + 1] - sorted[base])
//   } else {
//     return sorted[base]
//   }
// }

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

// Note this aggregation functions returns the new gradient, so it is necessary to keep track of globalMomentum and to update the currentModel adding the globalMomentum
// See: https://arxiv.org/abs/2012.10333
// export function avgClippingWeights (
//   peersWeights: Iterable<WeightsLike | WeightsContainer>,
//   currentModel: WeightsContainer,
//   tauPercentile: number
// ): WeightsContainer {
//   // Computing the centered peers weights with respect to the previous model aggragation
//   const centeredPeersWeights: List<WeightsContainer> = centerWeights(peersWeights, currentModel)

//   // Computing the Matrix Norm (Frobenius Norm) of the centered peers momentum
//   const normArray: number[] = Array.from(centeredPeersWeights.map((model) => model.frobeniusNorm()))
//   console.log(normArray)

//   // Computing the parameter tau as third percentile with respect to the norm array
//   const tau: number = computeQuantile(normArray, tauPercentile)
//   console.log(tau)

//   // Computing the centered clipped peers momentum given the norm array and the parameter tau
//   const clippedPeersMomentum: List<WeightsContainer> = clipWeights(centeredPeersWeights, normArray, tau)
//   // console.log(clippedPeersMomentum.toArray().map(weights => weights.weights.map(w => w.flatten().arraySync())))

//   // Aggregating all centered clipped peers momentum
//   return avg(clippedPeersMomentum.map((weights) => weights.add(globalMomentum)))
// }
