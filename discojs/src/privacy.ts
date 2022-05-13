import { List } from 'immutable'
import { Weights } from '@/types'
import { Task } from '@/task'
import * as tf from '@tensorflow/tfjs'

export function addDifferentialPrivacy (previousRoundWeights: Weights, currentRoundWeights: Weights, task: Task): Weights {
  const noiseScale = task.trainingInformation?.noiseScale ?? 0
  if (noiseScale === 0) {
    return currentRoundWeights
  }
  const clippingRadius = Math.max(1, task.trainingInformation?.clippingRadius ?? 1)

  const weightsDiff = List(currentRoundWeights)
    .zip(List(previousRoundWeights))
    .map(([w1, w2]) => w1.add(-w2))

  // Frobenius norm
  const norm = Math.sqrt(weightsDiff.map((w) => w.square().sum().dataSync()[0]).reduce((a: number, b) => a + b))

  const noisyWeightsDiff = weightsDiff.map((w) => {
    const clipped = w.div(Math.max(1, norm / clippingRadius))
    const noise = tf.randomNormal(w.shape, 0, (noiseScale * noiseScale) * (clippingRadius * clippingRadius))
    return clipped.add(noise)
  })

  return List(previousRoundWeights)
    .zip(noisyWeightsDiff)
    .map(([w, d]) => w.add(d))
    .toArray()
}
