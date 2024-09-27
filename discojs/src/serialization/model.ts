import type tf from '@tensorflow/tfjs'

import type { Model } from '../index.js'
import { models, serialization } from '../index.js'
import { GPTConfig } from '../models/index.js'

import * as coder from "./coder.js";
import { Encoded, isEncoded } from "./coder.js";

const Type = {
  TFJS: 0,
  GPT: 1
} as const

export async function encode(model: Model): Promise<Encoded> {
  switch (true) {
    case model instanceof models.TFJS: {
      const serialized = await model.serialize();
      return coder.encode([Type.TFJS, serialized]);
    }
    case model instanceof models.GPT: {
      const { weights, config } = model.serialize();
      const serializedWeights = await serialization.weights.encode(weights);
      return coder.encode([Type.GPT, serializedWeights, config]);
    }
    default:
      throw new Error("unknown model type");
  }
}

export async function decode (encoded: unknown): Promise<Model> {
  if (!isEncoded(encoded))
    throw new Error("Invalid encoding, raw encoding isn't an instance of Uint8Array")
  const raw = coder.decode(encoded)

  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("invalid encoding, encoding isn't an array or doesn't contain enough values")
  }
  const type = raw[0] as unknown
  if (typeof type !== 'number') {
    throw new Error('invalid encoding, first encoding field should be the model type')
  }
  const rawModel = raw[1] as unknown
  switch (type) {
    case Type.TFJS:
      if (raw.length !== 2) {
        throw new Error('invalid encoding, TFJS model encoding should be an array of length 2')
      }
      // TODO totally unsafe casting
      return await models.TFJS.deserialize(rawModel as tf.io.ModelArtifacts)
    case Type.GPT: {  
      let config
      if (raw.length == 2) {
        config = undefined
      } else if (raw.length == 3) {
        config = raw[2] as GPTConfig
      } else {
        throw new Error('invalid encoding, gpt-tfjs model encoding should be an array of length 2 or 3')
      }

      if (!isEncoded(rawModel))
        throw new Error(
          "invalid encoding, gpt-tfjs model weights should be an encoding of its weights",
        );
      const weights = serialization.weights.decode(rawModel)
      return models.GPT.deserialize({weights, config})
    }
    default:
      throw new Error('invalid encoding, model type unrecognized')
  }
}
