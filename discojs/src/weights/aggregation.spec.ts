import * as tf from "@tensorflow/tfjs";
import { assert, describe, it } from "vitest";
import { WeightsContainer, aggregation } from "./index.js";

describe("weights aggregation", () => {
  it("avg of weights with two operands", () => {
    const actual = aggregation.avg([
      WeightsContainer.of([1, 2, 3, -1], [-5, 6]),
      WeightsContainer.of([2, 3, 7, 1], [-10, 5]),
      WeightsContainer.of([3, 1, 5, 3], [-15, 19]),
    ]);
    const expected = WeightsContainer.of([2, 2, 5, 1], [-10, 10]);

    assert.isTrue(actual.equals(expected));
  });

  it("avg does not leak intermediate tensors", () => {
    const baseline = tf.memory().numTensors;

    const inputs = [
      WeightsContainer.of([1, 2, 3, -1], [-5, 6]),
      WeightsContainer.of([2, 3, 7, 1], [-10, 5]),
      WeightsContainer.of([3, 1, 5, 3], [-15, 19]),
    ];
    const result = aggregation.avg(inputs);

    inputs.forEach((input) => input.dispose());
    result.dispose();
    assert.strictEqual(tf.memory().numTensors, baseline);
  });

  it("avg of a single container does not leak intermediate tensors", async () => {
    const baseline = tf.memory().numTensors;

    const input = WeightsContainer.of([1, 2], [3]);
    const result = aggregation.avg([input]);

    // read values without allocating comparison tensors
    assert.deepStrictEqual(
      await Promise.all(result.weights.map(async (w) => [...(await w.data())])),
      [[1, 2], [3]],
    );
    input.dispose();
    result.dispose();
    assert.strictEqual(tf.memory().numTensors, baseline);
  });

  it("avg does not dispose nor alias its inputs", async () => {
    const inputs = [
      WeightsContainer.of([1, 2], [3]),
      WeightsContainer.of([3, 4], [5]),
    ];
    const result = aggregation.avg(inputs);

    for (const input of inputs)
      for (const weight of input.weights) assert.isFalse(weight.isDisposed);

    // the result must own fresh tensors, not views of the inputs
    inputs.forEach((input) => input.dispose());
    assert.deepStrictEqual(
      await Promise.all(result.weights.map(async (w) => [...(await w.data())])),
      [[2, 3], [4]],
    );
    result.dispose();
  });

  it("sum of weights with two operands", () => {
    const actual = aggregation.sum([
      [[3, -4], [9]],
      [[2, 13], [0]],
    ]);
    const expected = WeightsContainer.of([5, 9], [9]);

    assert.isTrue(actual.equals(expected));
  });

  it("diff of weights with two operands", () => {
    const actual = aggregation.diff([
      [
        [3, -4, 5],
        [9, 1],
      ],
      [
        [2, 13, 4],
        [0, 1],
      ],
    ]);
    const expected = WeightsContainer.of([1, -17, 1], [9, 0]);

    assert.isTrue(actual.equals(expected));
  });
});
