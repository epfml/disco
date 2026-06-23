import { describe, expect, it } from "vitest";

import { WeightsContainer } from "./index.js";
import {
  frobeniusNorm,
  clipNorm,
  addOptimalNoise,
  getClippingRadius,
} from "./privacy.js";
import { WeightNormHistory } from "./training/trainer.js";
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
});

describe("getClippingRadius", () => {
  it("correct average clipping radius and default radius", () => {
    const weightNormHistory = List([
      List([2, 4, 6]), // expected average norm is 4
      List([10]),
    ]);

    expect(
      getClippingRadius(weightNormHistory as WeightNormHistory, 5),
    ).toEqual([4, 5]);
  });

  it("uses smaller window size automatically if needed", () => {
    const weightNormHistory = List([List([2, 4])]);

    // Automatically use window size of 2 instead of 10
    expect(
      getClippingRadius(weightNormHistory as WeightNormHistory, 10),
    ).toEqual([3]);
  });
});
