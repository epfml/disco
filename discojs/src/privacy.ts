import { List } from 'immutable'
import { Weights } from '@/types'
import { tf } from '.'
import { DifferentialPrivacy } from './task/training_information'

/**
 * Add task-parametrized Gaussian noise to and clip the weights update between the previous and current rounds.
 * The previous round's weights are the last weights pulled from server/peers.
 * The current round's weights are obtained after a single round of training, from the previous round's weights.
 * @param updatedWeights weights from the current round
 * @param staleWeights weights from the previous round
 * @param task the task
 * @returns the noised weights for the current round
 */
export function addDifferentialPrivacy (updatedWeights: Weights, staleWeights: Weights,
  differentialPrivacy?: DifferentialPrivacy): Weights {
  const weightsDiff = List(updatedWeights)
    .zip(List(staleWeights))
    .map(([w1, w2]) => w1.add(-w2))

  let newWeightsDiff: List<tf.Tensor>

  const clippingRadius = differentialPrivacy?.clippingRadius
  const noiseScale = differentialPrivacy?.noiseScale

  if (clippingRadius !== undefined) {
    // Frobenius norm
    const norm = Math.sqrt(weightsDiff.map((w) => w.square().sum().dataSync()[0]).reduce((a: number, b) => a + b))

    newWeightsDiff = weightsDiff.map((w) => {
      const clipped = w.div(Math.max(1, norm / clippingRadius))
      if (noiseScale !== undefined) {
        // Add clipping and noise
        const noise = tf.randomNormal(w.shape, 0, (noiseScale * noiseScale) * (clippingRadius * clippingRadius))
        return clipped.add(noise)
      } else {
        // Add clipping without any noise
        return clipped
      }
    })
  } else {
    if (noiseScale !== undefined) {
      // Add noise without any clipping
      newWeightsDiff = weightsDiff.map((w) => tf.randomNormal(w.shape, 0, (noiseScale * noiseScale)))
    } else {
      return updatedWeights
    }
  }

  return List(staleWeights)
    .zip(newWeightsDiff)
    .map(([w, d]) => w.add(d))
    .toArray()
}
