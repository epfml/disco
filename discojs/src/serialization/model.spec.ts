import * as tf from "@tensorflow/tfjs";
import { assert, describe, expect, it } from "vitest";

import type { DataType } from "#types/index";
import type { Model, GPTConfig } from "#models/index";
import { GPT, TFJS } from "#models/index";

import { encode, decode } from "#serialization/model";
import { isEncoded } from "#serialization/coder";

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
