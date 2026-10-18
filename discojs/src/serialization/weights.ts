import * as tf from "@tensorflow/tfjs";

import { WeightsContainer } from "#weights/index";

import type { Encoded } from "#serialization/coder";
import {
  encode as encodeGeneric,
  decode as decodeGeneric,
} from "#serialization/coder";

type Serialized = {
  shape: number[];
  data: Float32Array;
};

function isSerialized(raw: unknown): raw is Serialized {
  if (typeof raw !== "object" || raw === null) return false;

  const { shape, data }: Partial<Record<"shape" | "data", unknown>> = raw;

  if (
    !(
      Array.isArray(shape) &&
      shape.every(
        (e): e is number =>
          typeof e === "number" && Number.isSafeInteger(e) && e >= 0,
      )
    ) ||
    !(data instanceof Float32Array)
  )
    return false;

  // tf.tensor throws if the shape doesn't match the data
  if (shape.reduce((acc, e) => acc * e, 1) !== data.length) return false;

  const _: Serialized = { shape, data };

  return true;
}

export async function encode(weights: WeightsContainer): Promise<Encoded> {
  const serialized: Serialized[] = await Promise.all(
    weights.weights.map(async (t) => ({
      shape: t.shape,
      data: await t.data<"float32">(),
    })),
  );

  return encodeGeneric(serialized);
}

export function decode(encoded: Encoded): WeightsContainer {
  const raw = decodeGeneric(encoded);

  if (!(Array.isArray(raw) && raw.every(isSerialized)))
    throw new Error("expected to decode an array of serialized weights");

  // payloads can come from untrusted peers, so free the already built tensors
  // if any of them fails
  return new WeightsContainer(
    tf.tidy(() => raw.map((w) => tf.tensor(w.data, w.shape))),
  );
}
