import * as tf from "@tensorflow/tfjs";
import { assert, describe, expect, it } from "vitest";

import type { DataType } from "#types/index";
import type { Model, GPTConfig } from "#models/index";
import { GPT, TFJS } from "#models/index";

import { encode, decode } from "#serialization/model";
import type { Encoded } from "#serialization/coder";
import {
  decode as decodeGeneric,
  encode as encodeGeneric,
  isEncoded,
} from "#serialization/coder";

async function getRawWeights(
  model: Model<DataType>,
): Promise<[number, Float32Array][]> {
  return Array.from(
    (
      await Promise.all(
        model.weights.weights.map(async (w) => await w.data<"float32">()),
      )
    ).entries(),
  );
}

type Encodable = Parameters<typeof encodeGeneric>[0];

/** Encode a TFJS model with arbitrary metadata, bypassing `TFJS.serialize` */
async function encodeTFJSWithMetadata(
  datatype: "image" | "tabular",
  metadata: Encodable,
): Promise<Encoded> {
  const rawModel = tf.sequential({
    layers: [tf.layers.dense({ inputShape: [2], units: 1 })],
  });
  rawModel.compile({ optimizer: "sgd", loss: "meanSquaredError" });

  // reuse a valid encoding and only replace its metadata
  const encoded = decodeGeneric(await encode(new TFJS(datatype, rawModel)));
  if (!Array.isArray(encoded)) throw new Error("expected an encoded array");
  const [type, encodedDatatype, artifacts] = encoded as Encodable[];

  return encodeGeneric([type, encodedDatatype, artifacts, metadata]);
}

describe("serialization", () => {
  it("can encode & decode a TFJS model", async () => {
    const rawModel = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [32, 32, 3],
          kernelSize: 3,
          filters: 16,
          activation: "relu",
        }),
      ],
    });
    rawModel.compile({ optimizer: "sgd", loss: "hinge" });
    const model = new TFJS("image", rawModel);

    const encoded = await encode(model);
    assert.isTrue(isEncoded(encoded));
    const decoded = await decode(encoded);

    expect(decoded).to.be.an.instanceof(TFJS);
    expect((decoded as TFJS<"image" | "tabular">).datatype).to.equal("image");
    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded),
    );
  });

  it("keeps TFJS model metadata", async () => {
    const rawModel = tf.sequential({
      layers: [tf.layers.dense({ inputShape: [2], units: 1 })],
    });
    rawModel.compile({ optimizer: "sgd", loss: "meanSquaredError" });
    const metadata = {
      tabularStandardization: {
        means: { a: 1, b: 2 },
        stds: { a: 0.5, b: 3 },
      },
    };
    const model = new TFJS("tabular", rawModel, metadata);

    const decoded = await decode(await encode(model));

    expect(decoded.metadata).to.deep.equal(metadata);
  });

  it("decodes a TFJS model without metadata as undefined", async () => {
    const rawModel = tf.sequential({
      layers: [tf.layers.dense({ inputShape: [2], units: 1 })],
    });
    rawModel.compile({ optimizer: "sgd", loss: "meanSquaredError" });

    const decoded = await decode(await encode(new TFJS("tabular", rawModel)));

    expect(decoded.metadata).to.be.undefined;
  });

  describe("rejects malformed TFJS model metadata", () => {
    const cases: Record<string, Encodable> = {
      "non object": "metadata",
      "non object standardization": { tabularStandardization: 1 },
      "missing stds": { tabularStandardization: { means: { a: 0 } } },
      "non number mean": {
        tabularStandardization: { means: { a: "0" }, stds: { a: 1 } },
      },
      "negative std": {
        tabularStandardization: { means: { a: 0 }, stds: { a: -1 } },
      },
      "different columns": {
        tabularStandardization: { means: { a: 0 }, stds: { b: 1 } },
      },
    };

    for (const [name, metadata] of Object.entries(cases))
      it(name, async () => {
        await expect(
          decode(await encodeTFJSWithMetadata("tabular", metadata)),
        ).rejects.toThrow(/invalid metadata/);
      });
  });

  it("rejects metadata on a non-tabular TFJS model", async () => {
    const metadata = {
      tabularStandardization: { means: { a: 0 }, stds: { a: 1 } },
    };

    await expect(
      decode(await encodeTFJSWithMetadata("image", metadata)),
    ).rejects.toThrow(/only supported for tabular models/);
  });

  it("can encode & decode a gpt-tfjs model", { timeout: 20_000 }, async () => {
    const config: GPTConfig = {
      modelType: "gpt-nano",
      lr: 0.01,
      maxIter: 10,
      evaluateEvery: 10,
      maxEvalBatches: 10,
      contextLength: 8,
    };
    const model = new GPT(config);

    const encoded = await encode(model);
    assert.isTrue(isEncoded(encoded));
    const decoded = await decode(encoded);

    assert.instanceOf(decoded, GPT);

    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded),
    );
    assert.deepEqual(model.config, decoded.config);
  });
});
