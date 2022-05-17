import { List } from 'immutable'
import { Weights } from '@/types'
import { Task } from '@/task'
import * as tf from '@tensorflow/tfjs'

export function addDifferentialPrivacy (previousRoundWeights: Weights, currentRoundWeights: Weights, task: Task): Weights {
  const noiseScale = task.trainingInformation?.noiseScale
  const clippingRadius = task.trainingInformation?.clippingRadius

  const weightsDiff = List(currentRoundWeights)
    .zip(List(previousRoundWeights))
    .map(([w1, w2]) => w1.add(-w2))

  let newWeightsDiff: List<tf.Tensor>

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
      return currentRoundWeights
    }
  }

  return List(previousRoundWeights)
    .zip(newWeightsDiff)
    .map(([w, d]) => w.add(d))
    .toArray()
}
