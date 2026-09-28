import * as tf from "@tensorflow/tfjs";
import { assert, describe, it } from "vitest";

import { WeightsContainer } from "#weights/index";
import { encode as encodeGeneric, isEncoded } from "#serialization/coder";
import { encode, decode } from "#serialization/weights";

describe("weights", () => {
  it("can encode what it decodes", async () => {
    const weights = WeightsContainer.of([1], [2], [3]);

    const encoded = await encode(weights);
    assert.isTrue(isEncoded(encoded));
    const decoded = decode(encoded);

    assert.sameDeepOrderedMembers(
      Array.from(
        (
          await Promise.all(
            decoded.weights.map(async (w) => await w.data<"float32">()),
          )
        ).entries(),
      ),
      Array.from(
        (
          await Promise.all(
            weights.weights.map(async (w) => await w.data<"float32">()),
          )
        ).entries(),
      ),
    );
  });

  const malformedShapes: [string, number[]][] = [
    ["mismatched data length", [3]],
    ["negative dimension", [-1]],
    ["non-integer dimension", [0.5]],
    ["NaN dimension", [Number.NaN]],
  ];
  for (const [name, shape] of malformedShapes)
    it(`rejects ${name} without leaking tensors`, () => {
      const encoded = encodeGeneric([
        { shape: [1], data: new Float32Array([1]) },
        { shape: [2], data: new Float32Array([1, 2]) },
        { shape, data: new Float32Array([1, 2]) },
      ]);

      const before = tf.memory().numTensors;
      assert.throws(() => decode(encoded));
      assert.equal(tf.memory().numTensors, before);
    });
});
