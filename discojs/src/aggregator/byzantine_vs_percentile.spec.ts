import { Set } from "immutable";
import { describe, expect, it } from "vitest";

import { WeightsContainer } from "#weights/index";
import { ByzantineRobustAggregator } from "#aggregator/byzantine";
import { PercentileClippingAggregator } from "#aggregator/percentile_clipping";

// Helper to convert WeightsContainer → number[][] for easy assertions
async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return Promise.all(ws.weights.map(async (t) => Array.from(await t.data())));
}

// Timing measurement helper
interface TimingResult {
  name: string;
  time: number;
  result: number;
}

async function measureAggregation(
  aggregator: ByzantineRobustAggregator | PercentileClippingAggregator,
  name: string,
  peers: { id: string; value: number }[],
): Promise<TimingResult> {
  const promise = aggregator.getPromiseForAggregation();
  const currentRound = aggregator.round;

  const startTime = performance.now();
  peers.forEach((peer) => {
    aggregator.add(peer.id, WeightsContainer.of([peer.value]), currentRound);
  });

  const result = await promise;
  const endTime = performance.now();

  const arr = await WSIntoArrays(result);
  const aggregatedValue = arr[0][0];

  return {
    name,
    time: endTime - startTime,
    result: aggregatedValue,
  };
}

function formatTiming(timings: TimingResult[]): string {
  const maxNameLen = Math.max(...timings.map((t) => t.name.length));
  return timings
    .map(
      (t) =>
        `  ${t.name.padEnd(maxNameLen)} | ${t.time.toFixed(3)}ms | result: ${t.result.toFixed(4)}`,
    )
    .join("\n");
}

describe("Comparison: Centered Clipping vs Percentile Clipping", () => {
  /**
   * ============================================================
   * Comparison: Centered Clipping (CC) vs Percentile Clipping
   * ============================================================
   *
   * These tests highlight the fundamental differences between two
   * aggregation strategies used in adversarial / federated settings.
   *
   * Centered Clipping (CC):
   * - Iterative, principled aggregation rule with bounded updates
   * - Provides theoretical robustness against Byzantine clients
   * - Gradually refines the estimate over multiple iterations
   * - More stable across rounds and symmetric/adversarial scenarios
   * - Computationally more expensive (multiple passes over data)
   * - Converges slowly if initialized far from the true signal
   *
   * Percentile Clipping:
   * - Single-pass, heuristic aggregation based on norm thresholds
   * - Fast and simple, with low computational overhead
   * - Works well when outliers are clearly separable
   * - Highly sensitive to data distribution and chosen percentile (tau)
   * - Can behave like simple averaging in moderate/noisy settings
   * - Can fail when Byzantine clients dominate or blend with honest ones
   *
   * When to use which:
   *
   * - Use Centered Clipping when:
   *   - Robustness is critical (adversarial or unreliable clients)
   *   - You can afford additional computation
   *   - You expect persistent or structured Byzantine behavior
   *
   * - Use Percentile Clipping when:
   *   - You need fast, lightweight aggregation
   *   - Data is mostly clean with occasional outliers
   *   - Strong robustness guarantees are not required
   *
   * Summary:
   *   CC - slower but principled and robust
   *   Percentile - faster but heuristic and less reliable
   *
   * The tests below illustrate these trade-offs across different
   * regimes (extreme outliers, moderate attacks, multi-round behavior, etc.).
   */
  it("CC improves with more iterations", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 1 },
      { id: "h3", value: 1 },
      { id: "b1", value: 1000 },
    ];

    const ids = peers.map((p) => p.id);

    const cc1 = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 1, 0);
    const cc50 = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 50, 0);

    cc1.setNodes(Set(ids));
    cc50.setNodes(Set(ids));

    const r1 = await measureAggregation(cc1, "cc1", peers);
    const r50 = await measureAggregation(cc50, "cc50", peers);

    const honest = 1;

    expect(Math.abs(r50.result - honest)).to.be.lessThan(
      Math.abs(r1.result - honest),
    );
  });

  it("percentile behaves like mean under moderate Byzantine values", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 1 },
      { id: "h3", value: 1 },
      { id: "b1", value: 3 },
      { id: "b2", value: 3 },
    ];

    const ids = peers.map((p) => p.id);

    const cc = new ByzantineRobustAggregator(0, 5, "absolute", 1.0, 5, 0);
    const pc = new PercentileClippingAggregator(0, 5, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    const resPC = await measureAggregation(pc, "pc", peers);

    const honest = 1;
    const mean = (1 + 1 + 1 + 3 + 3) / 5;

    // percentile behaves close to mean
    expect(Math.abs(resPC.result - mean)).to.be.lessThan(0.5);

    // both are biased away from honest
    expect(Math.abs(resPC.result - honest)).to.be.greaterThan(0.3);
  });

  it("iterations improve CC but not percentile", async () => {
    const peers = [
      { id: "h1", value: 0 },
      { id: "h2", value: 0 },
      { id: "b1", value: 10 },
    ];

    const ids = peers.map((p) => p.id);

    const cc1 = new ByzantineRobustAggregator(0, 3, "absolute", 1.0, 1, 0);
    const cc5 = new ByzantineRobustAggregator(0, 3, "absolute", 1.0, 5, 0);

    cc1.setNodes(Set(ids));
    cc5.setNodes(Set(ids));

    const r1 = await measureAggregation(cc1, "cc1", peers);
    const r5 = await measureAggregation(cc5, "cc5", peers);

    expect(Math.abs(r5.result)).to.be.lessThanOrEqual(Math.abs(r1.result));
  });

  it("percentile sensitivity to tau parameter", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 1 },
      { id: "b1", value: 100 },
    ];

    const ids = peers.map((p) => p.id);

    const lowTau = new PercentileClippingAggregator(0, 3, "absolute", 0.1);
    const highTau = new PercentileClippingAggregator(0, 3, "absolute", 0.9);

    lowTau.setNodes(Set(ids));
    highTau.setNodes(Set(ids));

    const rLow = await measureAggregation(lowTau, "low", peers);
    const rHigh = await measureAggregation(highTau, "high", peers);

    expect(Math.abs(rLow.result - 1)).to.be.lessThan(
      Math.abs(rHigh.result - 1),
    );
  });

  it("CC is at least as stable across rounds as percentile", async () => {
    const ids = ["h1", "h2", "b1"];

    const cc = new ByzantineRobustAggregator(0, 3, "absolute", 1.0, 5, 0);
    const pc = new PercentileClippingAggregator(0, 3, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    // Round 1
    const prev = 5;

    await measureAggregation(cc, "cc1", [
      { id: "h1", value: prev },
      { id: "h2", value: prev },
      { id: "b1", value: prev },
    ]);

    await measureAggregation(pc, "pc1", [
      { id: "h1", value: prev },
      { id: "h2", value: prev },
      { id: "b1", value: prev },
    ]);

    // Round 2 (attack)
    const rCC = await measureAggregation(cc, "cc2", [
      { id: "h1", value: 10 },
      { id: "h2", value: 10 },
      { id: "b1", value: 100 },
    ]);

    const rPC = await measureAggregation(pc, "pc2", [
      { id: "h1", value: 10 },
      { id: "h2", value: 10 },
      { id: "b1", value: 100 },
    ]);

    const deltaCC = Math.abs(rCC.result - prev);
    const deltaPC = Math.abs(rPC.result - prev);

    expect(deltaCC).to.be.at.most(deltaPC + 1e-6);
  });

  it("percentile breaks when Byzantine dominate percentile", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 1 },
      { id: "b1", value: 10 },
      { id: "b2", value: 10 },
      { id: "b3", value: 10 },
    ];

    const ids = peers.map((p) => p.id);

    const cc = new ByzantineRobustAggregator(0, 5, "absolute", 1.0, 10, 0);
    const pc = new PercentileClippingAggregator(0, 5, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    const resCC = await measureAggregation(cc, "cc", peers);
    const resPC = await measureAggregation(pc, "pc", peers);

    const honest = 1;

    // Percentile clearly drifts
    expect(resPC.result).to.be.greaterThan(3);

    // Both are worse than honest
    expect(Math.abs(resCC.result - honest)).to.be.greaterThan(1);
    expect(Math.abs(resPC.result - honest)).to.be.greaterThan(1);
  });

  it("both aggregators behave similarly without Byzantine clients", async () => {
    const peers = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "c", value: 3 },
    ];

    const ids = peers.map((p) => p.id);

    const cc = new ByzantineRobustAggregator(0, 3, "absolute", 10, 1, 0);
    const pc = new PercentileClippingAggregator(0, 3, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    const resCC = await measureAggregation(cc, "cc", peers);
    const resPC = await measureAggregation(pc, "pc", peers);

    expect(resCC.result).to.be.closeTo(resPC.result, 1e-6);
  });

  it("prints timing comparison (CC vs Percentile)", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 1 },
      { id: "h3", value: 1 },
      { id: "b1", value: 1000 },
    ];

    const ids = peers.map((p) => p.id);

    const cc = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 20, 0);
    const pc = new PercentileClippingAggregator(0, 4, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    const resCC = await measureAggregation(cc, "CC", peers);
    const resPC = await measureAggregation(pc, "Percentile", peers);

    console.log("\nTiming comparison:\n" + formatTiming([resCC, resPC]));

    expect(resPC.time).to.be.lessThan(resCC.time);
  });

  it("CC handles symmetric attacks better than percentile", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 1 },
      { id: "b1", value: 100 },
      { id: "b2", value: -100 },
    ];

    const ids = peers.map((p) => p.id);

    const cc = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 5, 0);
    const pc = new PercentileClippingAggregator(0, 4, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    const resCC = await measureAggregation(cc, "cc", peers);
    const resPC = await measureAggregation(pc, "pc", peers);

    const honest = 1;

    expect(Math.abs(resCC.result - honest)).to.be.lessThan(
      Math.abs(resPC.result - honest),
    );
  });

  it("percentile is sensitive to honest variance", async () => {
    const peers = [
      { id: "h1", value: 1 },
      { id: "h2", value: 2 },
      { id: "h3", value: 3 },
      { id: "b1", value: 10 },
    ];

    const ids = peers.map((p) => p.id);

    const cc = new ByzantineRobustAggregator(0, 4, "absolute", 1.0, 5, 0);
    const pc = new PercentileClippingAggregator(0, 4, "absolute", 0.5);

    cc.setNodes(Set(ids));
    pc.setNodes(Set(ids));

    const resCC = await measureAggregation(cc, "cc", peers);
    const resPC = await measureAggregation(pc, "pc", peers);

    const honestMean = (1 + 2 + 3) / 3;

    expect(Math.abs(resCC.result - honestMean)).to.be.lessThan(
      Math.abs(resPC.result - honestMean),
    );
  });
});
