import { expect } from "chai";
import { Set } from "immutable";
import * as tf from "@tensorflow/tfjs";

import { WeightsContainer } from "../index.js";
import { ByzantineRobustAggregator } from "./byzantine.js";

// Helper to convert WeightsContainer → number[][] for easy assertions
async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return Promise.all(ws.weights.map(async t => Array.from(await t.data())));
}

describe("ByzantineRobustAggregator", () => {
  it("throws on invalid constructor parameters", () => {
    expect(() => new ByzantineRobustAggregator(0, 1, 'absolute', 0, 1, 0.5)).to.throw();
    expect(() => new ByzantineRobustAggregator(0, 1, 'absolute', 1, 0, 0.5)).to.throw();
    expect(() => new ByzantineRobustAggregator(0, 1, 'absolute', 1, 1.1, 0.5)).to.throw();
    expect(() => new ByzantineRobustAggregator(0, 1, 'absolute', 1, 1, 1.5)).to.throw();
  });

  it("performs basic mean when clippingRadius is large and beta = 0", async () => {
    const agg = new ByzantineRobustAggregator(0, 2, 'absolute', 1e6, 1, 0);
    const [id1, id2] = ["c1", "c2"];
    agg.setNodes(Set.of(id1, id2));

    const p = agg.getPromiseForAggregation();
    agg.add(id1, WeightsContainer.of([1], [2]), 0);
    agg.add(id2, WeightsContainer.of([3], [4]), 0);

    const out = await p;
    const arr = await WSIntoArrays(out);
    expect(arr).to.deep.equal([[2], [3]]);
  });

  it("clips a single outlier with small radius", async () => {
    const agg = new ByzantineRobustAggregator(0, 3, 'absolute', 1.0, 1, 0);
    const [c1, c2, bad] = ["c1", "c2", "bad"];
    agg.setNodes(Set.of(c1, c2, bad));

    const p = agg.getPromiseForAggregation();
    agg.add(c1, WeightsContainer.of([1]), 0);
    agg.add(c2, WeightsContainer.of([1]), 0);
    agg.add(bad, WeightsContainer.of([100]), 0);

    const out = await p;
    const arr = await WSIntoArrays(out);
    expect(arr[0][0]).to.be.closeTo(1, 1e-6);
  });

  it("applies multiple clipping iterations (maxIterations > 1)", async () => {
    const agg = new ByzantineRobustAggregator(0, 2, 'absolute', 1.0, 3, 0);
    const [c1, bad] = ["c1", "bad"];
    agg.setNodes(Set.of(c1, bad));

    const p = agg.getPromiseForAggregation();
    agg.add(c1, WeightsContainer.of([0]), 0);
    agg.add(bad, WeightsContainer.of([10]), 0);

    const out = await p;
    const arr = await WSIntoArrays(out);
    expect(arr[0][0]).to.be.lessThan(1); // clipped closer to 0
  });

  it("uses momentum when beta > 0", async () => {
    const agg = new ByzantineRobustAggregator(0, 2, 'absolute', 1e6, 1, 0.5);
    const [c1, c2] = ["c1", "c2"];
    agg.setNodes(Set.of(c1, c2));

    const p1 = agg.getPromiseForAggregation();
    agg.add(c1, WeightsContainer.of([2]), 0);
    agg.add(c2, WeightsContainer.of([2]), 0);
    const out1 = await p1;
    const arr1 = await WSIntoArrays(out1);
    expect(arr1[0][0]).to.equal(2);

    const p2 = agg.getPromiseForAggregation();
    agg.add(c1, WeightsContainer.of([4]), 1);
    agg.add(c2, WeightsContainer.of([4]), 1);
    const out2 = await p2;
    const arr2 = await WSIntoArrays(out2);

    // With momentum = 0.5,  result = 0.5 * prev + 0.5 * current = 3.0
    expect(arr2[0][0]).to.be.closeTo(3, 1e-6);
  });

  it("respects roundCutoff — ignores old contributions", async () => {
    const agg = new ByzantineRobustAggregator(1, 1, 'absolute', 1e6, 1, 0);
    const id = "c1";
    agg.setNodes(Set.of(id));

    // Round 0
    const p0 = agg.getPromiseForAggregation();
    agg.add(id, WeightsContainer.of([10]), 0);
    const out0 = await p0;
    const arr0 = await WSIntoArrays(out0);
    expect(arr0[0][0]).to.equal(10);

    // Round 2 with cutoff=1 → contributions from round 0 should be discarded
    const p2 = agg.getPromiseForAggregation();
    agg.add(id, WeightsContainer.of([20]), 2);
    const out2 = await p2;
    const arr2 = await WSIntoArrays(out2);
    expect(arr2[0][0]).to.equal(20);
  });

  it("waits for minNbOfParticipants even with threshold met", async () => {
    const agg = new ByzantineRobustAggregator(0, 1, 'absolute', 1e6, 1, 0);
    agg.minNbOfParticipants = 2;

    const [c1, c2] = ["c1", "c2"];
    agg.setNodes(Set.of(c1, c2));

    const p = agg.getPromiseForAggregation();
    agg.add(c1, WeightsContainer.of([5]), 0);

    // Should not emit yet:
    let resolved = false;
    p.then(() => (resolved = true));
    await new Promise(r => setTimeout(r, 50));
    expect(resolved).to.be.false;

    agg.add(c2, WeightsContainer.of([7]), 0);
    const out = await p;
    const arr = await WSIntoArrays(out);
    expect(arr[0][0]).to.equal(6);
  });
});
