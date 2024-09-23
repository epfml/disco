import msgpack from 'msgpack-lite'
import type tf from '@tensorflow/tfjs'

import type { DataType, Model } from '../index.js'
import { models, serialization } from '../index.js'
import { GPTConfig } from '../models/index.js'

const Type = {
  TFJS: 0,
  GPT: 1
} as const

export type Encoded = Uint8Array

export function isEncoded (raw: unknown): raw is Encoded {
  return raw instanceof Uint8Array
}

export async function encode(model: Model<DataType>): Promise<Encoded> {
  let encoded;
  switch (true) {
    case model instanceof models.TFJS: {
      const serialized = await model.serialize();
      encoded = msgpack.encode([Type.TFJS, ...serialized]);
      break;
    }
    case model instanceof models.GPT: {
      const { weights, config } = model.serialize();
      const serializedWeights = await serialization.weights.encode(weights);
      encoded = msgpack.encode([Type.GPT, serializedWeights, config]);
      break;
    }
    default:
      throw new Error("unknown model type");
  }

  // Node's Buffer extends Node's Uint8Array, which might not be the same
  // as the browser's Uint8Array. we ensure here that it is.
  return new Uint8Array(encoded);
}

export async function decode(encoded: unknown): Promise<Model<DataType>> {
  if (!isEncoded(encoded)) {
    throw new Error("Invalid encoding, raw encoding isn't an instance of Uint8Array")
  }
  const raw: unknown = msgpack.decode(encoded)

  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("invalid encoding, encoding isn't an array or doesn't contain enough values")
  }
  const type = raw[0] as unknown
  if (typeof type !== 'number') {
    throw new Error('invalid encoding, first encoding field should be the model type')
  }
  const rawModel = raw[1] as unknown
  switch (type) {
    case Type.TFJS: {
      if (raw.length !== 3)
        throw new Error(
          "invalid encoding, TFJS model encoding should be an array of length 3",
        );
      const [rawDatatype, rawModel] = raw.slice(1) as unknown[];

      let datatype: DataType;
      switch (rawDatatype) {
        case "image":
        case "tabular":
        case "text":
          datatype = rawDatatype;
          break;
        default:
          throw new Error(
            "invalid encoding, TFJS model encoding should be an array of length 3",
          );
      }

      return await models.TFJS.deserialize([
        datatype,
        // TODO totally unsafe casting
        rawModel as tf.io.ModelArtifacts,
      ]);
    }
    case Type.GPT: {  
      let config
      if (raw.length == 2) {
        config = undefined
      } else if (raw.length == 3) {
        config = raw[2] as GPTConfig
      } else {
        throw new Error('invalid encoding, gpt-tfjs model encoding should be an array of length 2 or 3')
      }

      if (!Array.isArray(rawModel)) {
        throw new Error('invalid encoding, gpt-tfjs model weights should be an array')
      }
      const arr: unknown[] = rawModel
      if (arr.some((r) => typeof r !== 'number')) {
        throw new Error("invalid encoding, gpt-tfjs weights should be numbers")
      }
      const nums = arr as number[]
      const weights = serialization.weights.decode(nums)
      return models.GPT.deserialize({weights, config})
    }
    default:
      throw new Error('invalid encoding, model type unrecognized')
  }
}
