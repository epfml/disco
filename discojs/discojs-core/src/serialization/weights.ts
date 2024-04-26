import * as msgpack from 'msgpack-lite'
import * as tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../index.js'

interface Serialized {
  shape: number[]
  data: number[]
}

function isSerialized (raw: unknown): raw is Serialized {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { shape, data }: Partial<Record<'shape' | 'data', unknown>> = raw

  if (
    !(Array.isArray(shape) && shape.every((e) => typeof e === 'number')) ||
    !(Array.isArray(data) && data.every((e) => typeof e === 'number'))
  ) {
    return false
  }

  const _: Serialized = {
    shape: shape as number[],
    data: data as number[],
  }

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
  const raw: unknown = msgpack.decode(encoded)

  if (!(Array.isArray(raw) && raw.every(isSerialized))) {
    throw new Error('expected to decode an array of serialized weights')
  }

  return new WeightsContainer(raw.map((w) => tf.tensor(w.data, w.shape)))
}
