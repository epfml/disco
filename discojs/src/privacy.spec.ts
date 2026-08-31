import { describe, expect, it } from "vitest";

import { WeightsContainer } from "./index.js";
import {
  frobeniusNorm,
  clipNorm,
  addOptimalNoise,
  getClippingRadius,
} from "./privacy.js";
import * as tf from "@tensorflow/tfjs";
import { List } from "immutable";

async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
    (arr) => [...arr],
  );
}

/** Test the frobenius norm computation */
describe("frobeniusNorm", () => {
  it("computes Frobenius norm", async () => {
    const t = tf.tensor([3, 4]);
    const n = await frobeniusNorm(t);
    expect(n).toBeCloseTo(5, 1e-12);
  });

  it("does not leak intermediate tensors nor dispose its input", async () => {
    const baseline = tf.memory().numTensors;

    const t = tf.tensor([3, 4]);
    await frobeniusNorm(t);

    expect(t.isDisposed).toBe(false);
    t.dispose();
    expect(tf.memory().numTensors).toBe(baseline);
  });
});

describe("clipNorm", () => {
  it("clips a single-layer vector using single radius value", async () => {
    const result = await clipNorm(WeightsContainer.of([2]), [1]);
    expect(await WSIntoArrays(result)).toEqual([[1]]);
  });

  it("check if it does not change vector when it is already within radius", async () => {
    // norm is smaller than the clipping radius 10
    const result = await clipNorm(WeightsContainer.of([3, 4]), [10]);
    expect(await WSIntoArrays(result)).toEqual([[3, 4]]);
  });

  it("applying different clipping radii per layer", async () => {
    const wc = WeightsContainer.of([3, 4], [0, 6]);
    const result = await clipNorm(wc, [5, 3]); // apply different clipping radii for each layer

    expect(await WSIntoArrays(result)).toEqual([
      [3, 4],
      [0, 3],
    ]);
  });

  it("does not leak intermediate tensors nor dispose its input", async () => {
    const baseline = tf.memory().numTensors;

    // one layer above the radius (clipped), one within it (kept as-is)
    const input = WeightsContainer.of([2], [0, 6]);
    const result = await clipNorm(input, [1, 10]);

    for (const weight of input.weights) expect(weight.isDisposed).toBe(false);

    // the result must own fresh tensors, not views of the input
    input.dispose();
    expect(await WSIntoArrays(result)).toEqual([[1], [0, 6]]);
    result.dispose();
    expect(tf.memory().numTensors).toBe(baseline);
  });
});

describe("addOptimalNoise", () => {
  it("check if the structure is maintained", async () => {
    const weights = WeightsContainer.of([3, 4], [0, 6]);
    const epsilon = 1;
    const delta = 1e-5;
    const radius = [5, 3];

    const result = await addOptimalNoise(weights, epsilon, delta, radius);

    const resultArrays = await WSIntoArrays(result);

    // Check the structures of the weights are maintained
    expect(resultArrays[0].length).toBe(2);
    expect(resultArrays[1].length).toBe(2);

    // Check the values are numbers
    expect(Number.isFinite(resultArrays[0][0])).toBe(true);
    expect(Number.isFinite(resultArrays[0][1])).toBe(true);
    expect(Number.isFinite(resultArrays[1][0])).toBe(true);
    expect(Number.isFinite(resultArrays[1][1])).toBe(true);
  });

  it("does not leak intermediate tensors nor dispose its input", async () => {
    const baseline = tf.memory().numTensors;

    const input = WeightsContainer.of([3, 4], [0, 6]);
    const result = await addOptimalNoise(input, 1, 1e-5, [5, 3]);

    for (const weight of input.weights) expect(weight.isDisposed).toBe(false);

    // the internally clipped weights must be disposed and the result must own
    // fresh tensors, not views of the input
    input.dispose();
    expect((await WSIntoArrays(result)).flat().every(Number.isFinite)).toBe(
      true,
    );
    result.dispose();
    expect(tf.memory().numTensors).toBe(baseline);
  });
});

describe("getClippingRadius", () => {
  it("correct average clipping radius and default radius", () => {
    const weightNormHistory = List([
      List([2, 4, 6]), // expected average norm is 4
      List([10]),
    ]);

    expect(getClippingRadius(weightNormHistory, 5)).toEqual([4, 5]);
  });

  it("uses smaller window size automatically if needed", () => {
    const weightNormHistory = List([List([2, 4])]);

    // Automatically use window size of 2 instead of 10
    expect(getClippingRadius(weightNormHistory, 10)).toEqual([3]);
  });
});
