import * as msgpack from 'msgpack-lite'
import tf from '@tensorflow/tfjs'

import { WeightsContainer } from '..'

interface Serialized {
  shape: number[]
  data: number[]
}

function isSerialized (raw: unknown): raw is Serialized {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }
  if (!('shape' in raw && 'data' in raw)) {
    return false
  }
  const { shape, data } = raw as Record<'shape' | 'data', unknown>

  if (
    !(Array.isArray(shape) && shape.every((e) => typeof e === 'number')) ||
    !(Array.isArray(data) && data.every((e) => typeof e === 'number'))
  ) {
    return false
  }

  // eslint-disable-next-line
  const _: Serialized = {shape, data}

  return true
}

export type Encoded = number[]

export function isEncoded (raw: unknown): raw is Encoded {
  return Array.isArray(raw) && raw.every((e) => typeof e === 'number')
}

export async function encode (weights: WeightsContainer): Promise<Encoded> {
  const serialized: Serialized[] = await Promise.all(weights.weights.map(async (t) => {
    return {
      shape: t.shape as number[],
      data: [...await t.data<'float32'>()]
    }
  }))

  return [...msgpack.encode(serialized).values()]
}

export function decode (encoded: Encoded): WeightsContainer {
  const raw = msgpack.decode(encoded)

  if (!(Array.isArray(raw) && raw.every(isSerialized))) {
    throw new Error('expected to decode an array of serialized weights')
  }

  return new WeightsContainer(raw.map((w) => tf.tensor(w.data, w.shape)))
}
