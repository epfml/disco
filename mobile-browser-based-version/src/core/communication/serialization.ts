import * as tf from '@tensorflow/tfjs'

import { Weights } from '@/types'

export type SerializedWeights = Float32Array[]

export function isSerializedWeights (obj: unknown): obj is SerializedWeights {
  if (!Array.isArray(obj)) {
    return false
  }
  if (!obj.every((w) => w instanceof Float32Array)) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: SerializedWeights = obj

  return true
}

export async function serializeWeights (weights: Weights): Promise<SerializedWeights> {
  return await Promise.all(weights.map(async (t) => await t.data<'float32'>()))
}

export function deserializeWeights (serialized: SerializedWeights): Weights {
  return serialized.map((w) => tf.tensor(w))
}
