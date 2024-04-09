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
    const { weights, config } = model.serialize()
    const serializedWeights = await serialization.weights.encode(weights)
    return msgpack.encode([Type.GPT, serializedWeights, config])
  }

  throw new Error('unknown model type')
}

export async function decode (encoded: unknown): Promise<Model> {
  if (!isEncoded(encoded)) {
    throw new Error('invalid encoding')
  }
  const raw: unknown = msgpack.decode(encoded)

  if (!Array.isArray(raw) || raw.length == 0) {
    throw new Error('invalid encoding')
  }
  const type = raw[0] as unknown
  if (typeof type !== 'number') {
    throw new Error('invalid encoding')
  }
  switch (type) {
    case Type.TFJS:
      if (raw.length !== 2) {
        throw new Error('invalid encoding')
      }
      // TODO totally unsafe casting
      const rawModel = raw[1]
      return await models.TFJS.deserialize(rawModel as tf.io.ModelArtifacts)
    case Type.GPT: {    
      if (raw.length !== 3) {
        throw new Error('invalid encoding')
      }
      const rawModel = raw[1]
      const config = raw[2]
      if (!Array.isArray(rawModel)) {
        throw new Error('invalid encoding')
      }
      const arr: unknown[] = rawModel
      if (arr.some((r) => typeof r !== 'number')) {
        throw new Error('invalid encoding')
      }
      const nums = arr as number[]
      const weights = serialization.weights.decode(nums)
      return models.GPT.deserialize({weights, config})
    }
    default:
      throw new Error('invalid encoding')
  }
}
