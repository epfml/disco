import msgpack from 'msgpack-lite'
import type tf from '@tensorflow/tfjs'

import type { Model } from '..'
import { models } from '..'

export type Encoded = Uint8Array

export function isEncoded (raw: unknown): raw is Encoded {
  return raw instanceof Uint8Array
}

export async function encode (model: Model): Promise<Encoded> {
  if (model instanceof models.TFJS) {
    const serialized = await model.serialize()
    return msgpack.encode(serialized)
  }

  throw new Error('unknown model type')
}

export async function decode (encoded: unknown): Promise<Model> {
  if (!isEncoded(encoded)) {
    throw new Error('invalid encoding')
  }
  const raw = msgpack.decode(encoded)

  // TODO how to select model type? prepend with model id
  // TODO totally unsafe casting
  return await models.TFJS.deserialize(raw as tf.io.ModelArtifacts)
}
