import type tf from "@tensorflow/tfjs";

import { encode as w_encode, decode as w_decode } from "#serialization/weights";
import { GPT, TFJS } from "#models/index";
import type { Model , GPTConfig} from "#models/index";
import type { DataType } from "#dtypes/index";

import * as coder from "./coder.js";
import type { Encoded} from "./coder.js";
import { isEncoded } from "./coder.js";

const Type = {
  TFJS: 0,
  GPT: 1,
} as const;

export async function encode(model: Model<DataType>): Promise<Encoded> {
  switch (true) {
    case model instanceof TFJS: {
      const serialized = await model.serialize();
      return coder.encode([Type.TFJS, ...serialized]);
    }
    case model instanceof GPT: {
      const { weights, config } = model.serialize();
      const serializedWeights = await w_encode(weights);
      return coder.encode([Type.GPT, serializedWeights, config]);
    }
    default:
      throw new Error("unknown model type");
  }
}

export async function decode(encoded: Encoded): Promise<Model<DataType>> {
  const raw = coder.decode(encoded);

  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error(
      "invalid encoding, encoding isn't an array or doesn't contain enough values",
    );
  }
  const type = raw[0] as unknown;
  if (typeof type !== "number") {
    throw new Error(
      "invalid encoding, first encoding field should be the model type",
    );
  }
  const rawModel = raw[1] as unknown;
  switch (type) {
    case Type.TFJS: {
      if (raw.length !== 3)
        throw new Error(
          "invalid TFJS model encoding: should be an array of length 3",
        );
      const [rawDatatype, rawModel] = raw.slice(1) as unknown[];

      let datatype;
      switch (rawDatatype) {
        case "image":
        case "tabular":
          datatype = rawDatatype;
          break;
        default:
          throw new Error("invalid TFJS model encoding: invalid DataType");
      }

      return await TFJS.deserialize([
        datatype,
        // TODO totally unsafe casting
        rawModel as tf.io.ModelArtifacts,
      ]);
    }
    case Type.GPT: {
      let config;
      if (raw.length == 2) {
        config = undefined;
      } else if (raw.length == 3) {
        config = raw[2] as GPTConfig;
      } else {
        throw new Error(
          "invalid encoding, gpt-tfjs model encoding should be an array of length 2 or 3",
        );
      }

      if (!isEncoded(rawModel))
        throw new Error(
          "invalid encoding, gpt-tfjs model weights should be an encoding of its weights",
        );
      const weights = w_decode(rawModel);
      return GPT.deserialize({ weights, config });
    }
    default:
      throw new Error("invalid encoding, model type unrecognized");
  }
}
