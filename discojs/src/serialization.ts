import * as tf from '@tensorflow/tfjs'
import * as msgpack from 'msgpack-lite'

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

export type EncodedWeights = number[]

export function isEncodedWeights(raw: unknown): raw is EncodedWeights {
  return Array.isArray(raw) && raw.every((e) => typeof e === 'number')
}

export async function encodeWeights (weights: Weights): Promise<EncodedWeights> {
  const serialized = await Promise.all(weights.map(async (t) => {
      return {
        shape: t.shape,
        data: await t.data<'float32'>()
      }
    }))

  return [...msgpack.encode(serialized).values()]
}

export function decodeWeights (encoded: EncodedWeights): Weights {
  const raw = msgpack.decode(encoded)

  if (!(Array.isArray(raw) && raw.every(isSerializedWeight))) {
    throw new Error('expected to decode an array of serialized weights')
  }

  return raw.map((w) => tf.tensor(w.data, w.shape))
}
