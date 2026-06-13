import type tf from '@tensorflow/tfjs'

import type { DataType, Model } from '../index.js'
import { models, serialization } from '../index.js'
import { GPTConfig } from '../models/index.js'

import * as coder from "./coder.js";
import { Encoded, isEncoded } from "./coder.js";

import createDebug from "debug"

const debug = createDebug("discojs:serialization:model");

const Type = {
  TFJS: 0,
  GPT: 1
} as const

export async function encode(model: Model<DataType>): Promise<Encoded> {
  switch (true) {
    case model instanceof models.TFJS: {
      const serialized = await model.serialize();
      debug("TFJS model serialized");
      return coder.encode([Type.TFJS, ...serialized]);
    }
    case model instanceof models.GPT: {
      const { weights, config } = model.serialize();
      try {
        const serializedWeights = await serialization.weights.encode(weights);
        debug("GPT model weights serialized");
        return coder.encode([Type.GPT, serializedWeights, config]);
      } finally {
        weights.dispose();
      }
    }
    default:
      throw new Error("unknown model type");
  }
}

export async function decode(encoded: Encoded): Promise<Model<DataType>> {
  const raw = coder.decode(encoded)
 
  debug("IMPORTANT:model decoded")

  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("invalid encoding, encoding isn't an array or doesn't contain enough values")
  }

  debug("model encoding array length: %d", raw.length)

  const type = raw[0] as unknown
  if (typeof type !== 'number') {
    throw new Error('invalid encoding, first encoding field should be the model type')
  }

  debug("model type: %d", type) 

  const rawModel = raw[1] as unknown
  switch (type) {
    case Type.TFJS: {
      debug("TFJS model decoding started");
      if (raw.length !== 3)
        throw new Error(
          "invalid TFJS model encoding: should be an array of length 3",
        );
      const [rawDatatype, rawModel] = raw.slice(1) as unknown[];

      debug("TFJS model datatype: %s", rawDatatype);

      let datatype;
      switch (rawDatatype) {
        case "image":
        case "tabular":
          datatype = rawDatatype;
          break;
        default:
          throw new Error(
            "invalid TFJS model encoding: invalid DataType",
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
        debug("GPT model config decoding")
        config = raw[2] as GPTConfig
      } else {
        throw new Error('invalid encoding, gpt-tfjs model encoding should be an array of length 2 or 3')
      }

      if (!isEncoded(rawModel))
        throw new Error(
          "invalid encoding, gpt-tfjs model weights should be an encoding of its weights",
        );

      debug("GPT model weights decoding...")
      const weights = serialization.weights.decode(rawModel)

      debug("GPT model weights decoded, deserializing model... CONFIG MIGHT BE WRONG")
      debug("GPT model config: %O", config || "undefined, using default config")
      try {
        return models.GPT.deserialize({weights, config})
      } finally {
        weights.dispose()
      }
    }
    default:
      throw new Error('invalid encoding, model type unrecognized')
  }
}
