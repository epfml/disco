import { expect } from "chai";
import { WeightsContainer } from "./index.js";

import { addNoise, clipNorm } from "./privacy.js";

async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
    (arr) => [...arr],
  );
}

async function norm(weights: WeightsContainer): Promise<number> {
  return Math.sqrt(
    (
      await weights
        .map((w) => w.square().sum())
        .reduce((a, b) => a.add(b))
        .data()
    )[0],
  );
}

describe("addNoise", () => {
  it("returns the same weight vector with zero noise", async () => {
    const result = addNoise(WeightsContainer.of([1, 2, 3]), 0);

    expect(await WSIntoArrays(result)).to.deep.equal([[1, 2, 3]]);
  });

  it("adds noise following a normal distribution", async () => {
    const result = addNoise(WeightsContainer.of([5]), 1);

    expect((await WSIntoArrays(result))[0][0]).to.be.within(2, 8); // 99.7% of success
  });
});

describe("clipNorm", () => {
  it("reduce norm for a one-dimensional vector", async () => {
    const result = await clipNorm(WeightsContainer.of([2]), 1);

    expect(await WSIntoArrays(result)).to.deep.equal([[1]]);
  });

  it("keeps direction unchanged", async () => {
    const result = await clipNorm(
      WeightsContainer.of([2, 3, 6]), // norm = 7
      1,
    );
    const normScaler = 7 / (await norm(result));

    expect(
      await WSIntoArrays(result.map((w) => w.mul(normScaler))),
    ).to.deep.equal([[2, 3, 6]]);
  });
});
