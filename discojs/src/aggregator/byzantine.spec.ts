import fc from "fast-check";
import { Set } from "immutable";
import { describe, expect, it } from "vitest";

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

  it("applies momentum before aggregation", async () => {
    const agg = new ByzantineRobustAggregator(0, 2, 'absolute', 1e6, 1, 0.5);
    const [a, b] = ["a", "b"];
    agg.setNodes(Set.of(a, b));

    const p1 = agg.getPromiseForAggregation();
    agg.add(a, WeightsContainer.of([0]), 0);
    agg.add(b, WeightsContainer.of([10]), 0);
    await p1;

    const p2 = agg.getPromiseForAggregation();
    agg.add(a, WeightsContainer.of([0]), 1);
    agg.add(b, WeightsContainer.of([20]), 1);
    const out = await p2;

    const arr = await WSIntoArrays(out);
    expect(arr[0][0]).to.be.closeTo(7.5, 1e-6); // mean of (0, 15)
  });

  it("beta = 1 freezes aggregation after first round", async () => {
    const agg = new ByzantineRobustAggregator(0, 1, 'absolute', 1e6, 1, 1);
    const id = "c1";
    agg.setNodes(Set.of(id));

    const p1 = agg.getPromiseForAggregation();
    agg.add(id, WeightsContainer.of([5]), 0);
    await p1;

    const p2 = agg.getPromiseForAggregation();
    agg.add(id, WeightsContainer.of([100]), 1);
    const out = await p2;

    const arr = await WSIntoArrays(out);
    expect(arr[0][0]).to.equal(5);
  });

  it("remains robust with 30% Byzantine clients", async () => {
    const honest = Array(7).fill(1);
    const byzantine = Array(3).fill(100);

    const agg = new ByzantineRobustAggregator(0, 10, 'absolute', 1.0, 5, 0);
    const ids = [...honest, ...byzantine].map((_, i) => `c${i}`);
    agg.setNodes(Set(ids));

    const p = agg.getPromiseForAggregation();
    honest.forEach((v, i) => agg.add(`c${i}`, WeightsContainer.of([v]), 0));
    byzantine.forEach((v, i) => agg.add(`c${i + honest.length}`, WeightsContainer.of([v]), 0));

    const out = await p;
    const arr = await WSIntoArrays(out);

    const honestMean = honest.reduce((a, b) => a + b, 0) / honest.length;
    const rawMean = [...honest, ...byzantine].reduce((a, b) => a + b, 0) / (honest.length + byzantine.length);

    expect(Math.abs(arr[0][0] - honestMean)).to.be.lessThan(Math.abs(rawMean - honestMean));
  });

  it("stays close to the honest signal under constant input", async () => {
    const agg = new ByzantineRobustAggregator(0, 3, 'absolute', 1.0, 3, 0.9);
    const ids = ["a", "b", "c"];
    agg.setNodes(Set(ids));

    for (let r = 0; r < 10; r++) {
      const p = agg.getPromiseForAggregation();
      ids.forEach(id => agg.add(id, WeightsContainer.of([1]), r));
      const out = await p;
      const arr = await WSIntoArrays(out);

      expect(Math.abs(arr[0][0] - 1)).to.be.lessThan(0.3);
    }
  });

  it("bounds the marginal influence of a single Byzantine client", async () => {
    const clipRadius = 1.0;

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.double({ min: -1, max: 1 }), { minLength: 3, maxLength: 10 }),
        async (honest) => {
          const n = honest.length + 1;

          // aggregation without Byzantine
          const aggClean = new ByzantineRobustAggregator(0, honest.length, "absolute", clipRadius, 1, 0);
          const honestIds = honest.map((_, i) => `h${i}`);
          aggClean.setNodes(Set(honestIds));

          const pClean = aggClean.getPromiseForAggregation();
          honest.forEach((v, i) => aggClean.add(`h${i}`, WeightsContainer.of([v]), 0));
          const cleanOut = await pClean;
          const clean = (await cleanOut.weights[0].data())[0];

          // aggregation with Byzantine
          const aggByz = new ByzantineRobustAggregator(0, n, "absolute", clipRadius, 1, 0);
          const ids = honestIds.concat("byz");
          aggByz.setNodes(Set(ids));

          const pByz = aggByz.getPromiseForAggregation();
          honest.forEach((v, i) => aggByz.add(`h${i}`, WeightsContainer.of([v]), 0));
          aggByz.add("byz", WeightsContainer.of([1e9]), 0);
          const byzOut = await pByz;
          const byz = (await byzOut.weights[0].data())[0];

          const deviation = Math.abs(byz - clean);
          const maxAllowed = 2 * clipRadius / n; // realistic tolerance for extreme inputs
          expect(deviation).toBeLessThanOrEqual(maxAllowed);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("is invariant to client ordering", async () => {
    const values = [0, 1, 100];
    const ids1 = ["a", "b", "c"];
    const ids2 = ["c", "a", "b"];

    const run = async (ids: string[]) => {
      const agg = new ByzantineRobustAggregator(0, 3, "absolute", 1.0, 3, 0);
      agg.setNodes(Set(ids));
      const p = agg.getPromiseForAggregation();
      ids.forEach((id, i) =>
        agg.add(id, WeightsContainer.of([values[i]]), 0)
      );
      return (await (await p).weights[0].data())[0];
    };

    const out1 = await run(ids1);
    const out2 = await run(ids2);

    expect(out1).to.be.closeTo(out2, 1e-6);
  });

  it("is idempotent when all inputs are identical and within clipping radius", async () => {
    const agg = new ByzantineRobustAggregator(0, 5, "absolute", 10.0, 5, 0);
    const ids = ["a", "b", "c", "d", "e"];
    agg.setNodes(Set(ids));

    const p = agg.getPromiseForAggregation();
    ids.forEach(id => agg.add(id, WeightsContainer.of([3.14]), 0));
    const out = await p;

    const v = (await out.weights[0].data())[0];
    expect(v).to.be.closeTo(3.14, 1e-6);
  });

  it("limits bias under symmetric Byzantine attacks", async () => {
    const agg = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 3, 0);
    agg.setNodes(Set(["h1", "h2", "b1", "b2"]));

    const p = agg.getPromiseForAggregation();
    agg.add("h1", WeightsContainer.of([1]), 0);
    agg.add("h2", WeightsContainer.of([1]), 0);
    agg.add("b1", WeightsContainer.of([100]), 0);
    agg.add("b2", WeightsContainer.of([-100]), 0);

    const out = await p;
    const v = (await out.weights[0].data())[0];

    expect(Math.abs(v - 1)).to.be.lessThan(0.3);
  });

  it("output lies within the range of clipped inputs", async () => {
    const agg = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 3, 0);
    agg.setNodes(Set(["a", "b", "c", "d"]));

    const p = agg.getPromiseForAggregation();
    agg.add("a", WeightsContainer.of([0]), 0);
    agg.add("b", WeightsContainer.of([0.5]), 0);
    agg.add("c", WeightsContainer.of([1]), 0);
    agg.add("d", WeightsContainer.of([100]), 0);

    const out = await p;
    const v = (await out.weights[0].data())[0];

    expect(v).to.be.greaterThanOrEqual(0);
    expect(v).to.be.lessThanOrEqual(1);
  });

  it("single client cannot dominate aggregation", async () => {
    const agg = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 3, 0);
    agg.setNodes(Set(["h1", "h2", "h3", "b"]));

    const p = agg.getPromiseForAggregation();
    agg.add("h1", WeightsContainer.of([0]), 0);
    agg.add("h2", WeightsContainer.of([0]), 0);
    agg.add("h3", WeightsContainer.of([0]), 0);
    agg.add("b", WeightsContainer.of([1e9]), 0);

    const out = await p;
    const v = (await out.weights[0].data())[0];

    expect(Math.abs(v)).to.be.lessThan(0.5);
  });

  it("reset state when starting fresh aggregator", async () => {
    const run = async () => {
      const agg = new ByzantineRobustAggregator(0, 2, "absolute", 1.0, 3, 0.9);
      agg.setNodes(Set(["a", "b"]));
      const p = agg.getPromiseForAggregation();
      agg.add("a", WeightsContainer.of([1]), 0);
      agg.add("b", WeightsContainer.of([1]), 0);
      return (await (await p).weights[0].data())[0];
    };

    expect(await run()).to.be.closeTo(await run(), 1e-6);
  });
});
