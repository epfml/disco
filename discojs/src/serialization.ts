import * as tf from '@tensorflow/tfjs'

import { Weights } from '@/types'

interface SerializedWeight {
  shape: number[]
  data: Float32Array
}

function isSerializedWeight (raw: unknown): raw is SerializedWeight {
  if (typeof raw !== 'object') {
    return false
  }
  if (!('shape' in raw && 'data' in raw)) {
    return false
  }
  const { shape, data } = raw as Record<'shape' | 'data', unknown>

  if (
    !(Array.isArray(shape) && shape.every((e) => typeof e === 'number')) ||
    !(data instanceof Float32Array)
  ) {
    return false
  }

  // eslint-disable-next-line
  const _: SerializedWeight = { shape, data }

  return true
}

export type SerializedWeights = SerializedWeight[]

export function isSerializedWeights (obj: unknown): obj is SerializedWeights {
  if (!Array.isArray(obj)) {
    return false
  }
  const arr: unknown[] = obj
  if (!arr.every(isSerializedWeight)) {
    return false
  }

  // eslint-disable-next-line
  const _: SerializedWeights = arr

  return true
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
