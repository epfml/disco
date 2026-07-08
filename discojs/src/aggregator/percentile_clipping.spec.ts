import { Set } from "immutable";
import { describe, expect, it } from "vitest";

import { WeightsContainer } from "../index.js";
import { PercentileClippingAggregator } from "./percentile_clipping.js";

async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return Promise.all(ws.weights.map(async (t) => Array.from(await t.data())));
}

describe("PercentileClippingAggregator", () => {
  it("throws on invalid constructor parameters", () => {
    expect(
      () => new PercentileClippingAggregator(0, 1, "absolute", 0),
    ).to.throw();
    expect(
      () => new PercentileClippingAggregator(0, 1, "absolute", 1),
    ).to.throw();
    expect(
      () => new PercentileClippingAggregator(0, 1, "absolute", -0.1),
    ).to.throw();
  });

  it("behaves like mean when no clipping occurs", async () => {
    const agg = new PercentileClippingAggregator(0, 3, "absolute", 0.5);
    agg.setNodes(Set(["a", "b", "c"]));

    const p = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([1]), 0);
    agg.add("b", WeightsContainer.of([2]), 0);
    agg.add("c", WeightsContainer.of([3]), 0);

    const out = await p;
    const arr = await WSIntoArrays(out);

    expect(arr[0][0]).to.be.closeTo(2, 1e-6);
  });

  it("reduces influence of a large outlier (heuristically)", async () => {
    const agg = new PercentileClippingAggregator(0, 4, "absolute", 0.5);
    agg.setNodes(Set(["a", "b", "c", "d"]));

    const p = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([1]), 0);
    agg.add("b", WeightsContainer.of([1]), 0);
    agg.add("c", WeightsContainer.of([1]), 0);
    agg.add("d", WeightsContainer.of([100]), 0);

    const out = await p;
    const v = (await out.weights[0].data())[0];

    const mean = (1 + 1 + 1 + 100) / 4;

    expect(Math.abs(v - 1)).to.be.lessThan(Math.abs(mean - 1));
  });

  it("is idempotent when all inputs are identical", async () => {
    const agg = new PercentileClippingAggregator(0, 4, "absolute", 0.5);
    agg.setNodes(Set(["a", "b", "c", "d"]));

    const p = agg.getPromiseForAggregation();
    ["a", "b", "c", "d"].forEach((id) =>
      agg.add(id, WeightsContainer.of([5]), 0),
    );

    const out = await p;
    const v = (await out.weights[0].data())[0];

    expect(v).to.be.closeTo(5, 1e-6);
  });

  it("is invariant to client ordering", async () => {
    const values = [1, 2, 100];
    const ids1 = ["a", "b", "c"];
    const ids2 = ["c", "a", "b"];

    const run = async (ids: string[]) => {
      const agg = new PercentileClippingAggregator(0, 3, "absolute", 0.5);
      agg.setNodes(Set(ids));
      const p = agg.getPromiseForAggregation();
      ids.forEach((id, i) => agg.add(id, WeightsContainer.of([values[i]]), 0));
      return (await (await p).weights[0].data())[0];
    };

    const out1 = await run(ids1);
    const out2 = await run(ids2);

    expect(out1).to.be.closeTo(out2, 1e-6);
  });

  it("lower percentile increases clipping strength", async () => {
    const nodes = ["a", "b", "c", "d"];
    const inputs = [1, 1, 1, 100];

    const aggLow = new PercentileClippingAggregator(0, 4, "absolute", 0.1);
    const aggHigh = new PercentileClippingAggregator(0, 4, "absolute", 0.9);

    aggLow.setNodes(Set(nodes));
    aggHigh.setNodes(Set(nodes));

    const pLow = aggLow.getPromiseForAggregation();
    const pHigh = aggHigh.getPromiseForAggregation();

    nodes.forEach((n, i) => {
      aggLow.add(n, WeightsContainer.of([inputs[i]]), 0);
      aggHigh.add(n, WeightsContainer.of([inputs[i]]), 0);
    });

    const vLow = (await (await pLow).weights[0].data())[0];
    const vHigh = (await (await pHigh).weights[0].data())[0];

    expect(Math.abs(vLow - 1)).to.be.lessThan(Math.abs(vHigh - 1));
  });

  it("handles zero-norm inputs without NaN", async () => {
    const agg = new PercentileClippingAggregator(0, 2, "absolute", 0.5);
    agg.setNodes(Set(["a", "b"]));

    const p = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([0]), 0);
    agg.add("b", WeightsContainer.of([0]), 0);

    const out = await p;
    const v = (await out.weights[0].data())[0];

    expect(Number.isFinite(v)).to.be.true;
  });

  it("respects roundCutoff", async () => {
    const agg = new PercentileClippingAggregator(1, 1, "absolute", 0.5);
    agg.setNodes(Set(["a"]));

    const p0 = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([10]), 0);
    const v0 = (await (await p0).weights[0].data())[0];
    expect(v0).to.equal(10);

    const p2 = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([20]), 2);
    const v2 = (await (await p2).weights[0].data())[0];
    expect(v2).to.equal(20);
  });

  it("can fail under strong Byzantine attack (documented limitation)", async () => {
    const agg = new PercentileClippingAggregator(0, 4, "absolute", 0.5);
    agg.setNodes(Set(["a", "b", "c", "d"]));

    const p = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([1]), 0);
    agg.add("b", WeightsContainer.of([1]), 0);
    agg.add("c", WeightsContainer.of([50]), 0);
    agg.add("d", WeightsContainer.of([100]), 0);

    const out = await p;
    const v = (await out.weights[0].data())[0];

    // We don't assert correctness — only that it doesn't explode
    expect(Number.isFinite(v)).to.be.true;
  });

  it("reset state when starting fresh aggregator", async () => {
    const run = async () => {
      const agg = new PercentileClippingAggregator(0, 2, "absolute", 0.5);
      agg.setNodes(Set(["a", "b"]));
      const p = agg.getPromiseForAggregation();
      agg.add("a", WeightsContainer.of([1]), 0);
      agg.add("b", WeightsContainer.of([1]), 0);
      return (await (await p).weights[0].data())[0];
    };

    expect(await run()).to.be.closeTo(await run(), 1e-6);
  });
});
