import * as tf from '@tensorflow/tfjs'

import { Weights } from '@/types'

export type SerializedWeights = {
  shape: number[]
  data: Float32Array
}[]

export function isSerializedWeights (obj: unknown): obj is SerializedWeights {
  return true // FIXME
}

export async function serializeWeights (weights: Weights): Promise<SerializedWeights> {
  return await Promise.all(weights.map(async (t) => {
    return {
      shape: t.shape,
      data: await t.data<'float32'>()
    }
  }))
}

export function deserializeWeights (serialized: SerializedWeights): Weights {
  return serialized.map((w) => tf.tensor(w.data, w.shape))
}
