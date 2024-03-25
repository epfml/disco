import msgpack from 'msgpack-lite'
import type tf from '@tensorflow/tfjs'

import type { Model } from '../index.js'
import { models, serialization } from '../index.js'

const Type = {
  TFJS: 0,
  GPT: 1
} as const

export type Encoded = Uint8Array

export function isEncoded (raw: unknown): raw is Encoded {
  return raw instanceof Uint8Array
}

export async function encode (model: Model): Promise<Encoded> {
  if (model instanceof models.TFJS) {
    const serialized = await model.serialize()
    return msgpack.encode([Type.TFJS, serialized])
  }

  if (model instanceof models.GPT) {
    const serialized = await serialization.weights.encode(model.serialize())
    return msgpack.encode([Type.GPT, serialized])
  }

  throw new Error('unknown model type')
}

export async function decode (encoded: unknown): Promise<Model> {
  if (!isEncoded(encoded)) {
    throw new Error('invalid encoding')
  }
  const raw: unknown = msgpack.decode(encoded)

  if (!Array.isArray(raw) || raw.length !== 2) {
    throw new Error('invalid encoding')
  }
  const [type, rawModel] = raw as [unknown, unknown]

  if (typeof type !== 'number') {
    throw new Error('invalid encoding')
  }
  switch (type) {
    case Type.TFJS:
      // TODO totally unsafe casting
      return await models.TFJS.deserialize(rawModel as tf.io.ModelArtifacts)
    case Type.GPT: {
      if (!Array.isArray(rawModel)) {
        throw new Error('invalid encoding')
      }
      const arr: unknown[] = rawModel
      if (arr.some((r) => typeof r !== 'number')) {
        throw new Error('invalid encoding')
      }
      const nums = arr as number[]

      const serialized = serialization.weights.decode(nums)
      return models.GPT.deserialize(serialized)
    }
    default:
      throw new Error('invalid encoding')
  }
}
