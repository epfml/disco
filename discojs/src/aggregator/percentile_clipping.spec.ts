import { Set } from "immutable";
import { describe, expect, it } from "vitest";

import { WeightsContainer } from "../index.js";
import { ByzantineRobustAggregator } from "./byzantine.js";
import { PercentileClippingAggregator } from "./percentile_clipping.js";

// Helper to convert WeightsContainer → number[][] for easy assertions
async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return Promise.all(ws.weights.map(async t => Array.from(await t.data())));
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
  peers: { id: string; value: number }[]
): Promise<TimingResult> {
  const promise = aggregator.getPromiseForAggregation();
  const currentRound = aggregator.round;
  
  const startTime = performance.now();
  peers.forEach(peer => {
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
  const maxNameLen = Math.max(...timings.map(t => t.name.length));
  return timings
    .map(t => `  ${t.name.padEnd(maxNameLen)} | ${t.time.toFixed(3)}ms | result: ${t.result.toFixed(4)}`)
    .join('\n');
}

describe("Performance Comparison: Old vs New Byzantine Aggregators", () => {
  /**
   * Comparison test: Centered Clipping (Current) vs Percentile-based Clipping (Old)
   * 
   * Setup:
   * - Multiple honest updates (value=1.0)
   * - Multiple Byzantine updates (value=100)
   * - Measure robustness of aggregated result
   */

  it("both aggregators handle simple outlier rejection", async () => {
    const honestPeers = ["honest1", "honest2"];
    const byzantinePeers = ["byzantine1"];
    const allPeers = honestPeers.concat(byzantinePeers);

    // --- TEST 1: New Aggregator (Centered Clipping with iterations) ---
    const newAgg = new ByzantineRobustAggregator(0, 3, "absolute", 1.0, 1, 0);
    newAgg.setNodes(Set(allPeers));

    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 100.0 })),
    ];

    const timingNew = await measureAggregation(newAgg, "New ByzantineRobust", peersWithValues);

    // --- TEST 2: Old Aggregator (Percentile Clipping) ---
    const oldAgg = new PercentileClippingAggregator(0, 3, "absolute", 0.1);
    oldAgg.setNodes(Set(allPeers));

    const timingOld = await measureAggregation(oldAgg, "Old PercentileClipping", peersWithValues);

    // Both should produce a value closer to 1.0 than 100.0
    expect(timingNew.result).toBeLessThan(50);
    expect(timingOld.result).toBeLessThan(50);

    // Print timing comparison
    console.log("\n=== Timing Comparison: Simple Outlier Rejection ===");
    console.log(formatTiming([timingNew, timingOld]));
  });

  it("old aggregator with different percentiles", async () => {
    const honestPeers = ["honest1", "honest2", "honest3"];
    const byzantinePeers = ["byzantine1", "byzantine2"];
    const allPeers = honestPeers.concat(byzantinePeers);

    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 50.0 })),
    ];

    const testPercentiles = [0.05, 0.1, 0.2, 0.5];
    const timings: TimingResult[] = [];

    for (const tau of testPercentiles) {
      const agg = new PercentileClippingAggregator(0, 5, "absolute", tau);
      agg.setNodes(Set(allPeers));

      const timing = await measureAggregation(agg, `tau=${tau}`, peersWithValues);
      timings.push(timing);

      // Should clip towards honest value
      expect(timing.result).toBeLessThan(30);
    }

    console.log("\n=== Timing Comparison: Old Aggregator with Different Percentiles ===");
    console.log(formatTiming(timings));
  });

  it("new aggregator with different clipping radii", async () => {
    const honestPeers = ["honest1", "honest2", "honest3"];
    const byzantinePeers = ["byzantine1", "byzantine2"];
    const allPeers = honestPeers.concat(byzantinePeers);

    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 50.0 })),
    ];

    const testRadii = [0.5, 1.0, 2.0, 5.0];
    const timings: TimingResult[] = [];

    for (const radius of testRadii) {
      const agg = new ByzantineRobustAggregator(0, 5, "absolute", radius, 1, 0);
      agg.setNodes(Set(allPeers));

      const timing = await measureAggregation(agg, `radius=${radius}`, peersWithValues);
      timings.push(timing);

      // With larger radius, more Byzantine influence
      expect(timing.result).toBeGreaterThan(0);
    }

    console.log("\n=== Timing Comparison: New Aggregator with Different Clipping Radii ===");
    console.log(formatTiming(timings));
  });

  it("old aggregator stores previous aggregation state", async () => {
    const agg = new PercentileClippingAggregator(0, 2, "absolute", 0.1);
    const [peer1, peer2] = ["peer1", "peer2"];
    agg.setNodes(Set([peer1, peer2]));

    // Round 1
    const peersRound1 = [
      { id: peer1, value: 5.0 },
      { id: peer2, value: 5.0 },
    ];

    const timingRound1 = await measureAggregation(agg, "Round 1", peersRound1);
    expect(timingRound1.result).to.equal(5.0);

    // Round 2 - should center around previous result
    const peersRound2 = [
      { id: peer1, value: 10.0 },
      { id: peer2, value: 10.0 },
    ];

    const timingRound2 = await measureAggregation(agg, "Round 2", peersRound2);

    // With centering on previous (5.0), updates to 10.0 should result in something close to 10.0
    expect(timingRound2.result).toBeGreaterThan(5.0);

    console.log("\n=== Timing Comparison: State Preservation Across Rounds ===");
    console.log(formatTiming([timingRound1, timingRound2]));
  });

  it("scalability: larger peer set (10 peers)", async () => {
    const numHonest = 7;
    const numByzantine = 3;
    const honestPeers = Array.from({ length: numHonest }, (_, i) => `honest${i}`);
    const byzantinePeers = Array.from({ length: numByzantine }, (_, i) => `byzantine${i}`);
    const allPeers = honestPeers.concat(byzantinePeers);

    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 100.0 })),
    ];

    const newAgg = new ByzantineRobustAggregator(0, allPeers.length, "absolute", 1.0, 1, 0);
    newAgg.setNodes(Set(allPeers));
    const timingNew = await measureAggregation(newAgg, "New (10 peers)", peersWithValues);

    const oldAgg = new PercentileClippingAggregator(0, allPeers.length, "absolute", 0.1);
    oldAgg.setNodes(Set(allPeers));
    const timingOld = await measureAggregation(oldAgg, "Old (10 peers)", peersWithValues);

    console.log("\n=== Scalability Test: 10 Peers (7 honest, 3 Byzantine) ===");
    console.log(formatTiming([timingNew, timingOld]));
    console.log(`  Speedup: ${(timingOld.time / timingNew.time).toFixed(2)}x`);
  });

  it("iterative refinement: new aggregator with multiple iterations", async () => {
    const honestPeers = ["honest1", "honest2", "honest3"];
    const byzantinePeers = ["byzantine1", "byzantine2"];
    const allPeers = honestPeers.concat(byzantinePeers);

    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 50.0 })),
    ];

    const iterations = [1, 2, 5, 10];
    const timings: TimingResult[] = [];

    for (const iter of iterations) {
      const agg = new ByzantineRobustAggregator(0, 5, "absolute", 1.0, iter, 0);
      agg.setNodes(Set(allPeers));

      const timing = await measureAggregation(agg, `iterations=${iter}`, peersWithValues);
      timings.push(timing);
    }

    console.log("\n=== Performance Impact of Iterative Refinement ===");
    console.log(formatTiming(timings));
  });

  it("equivalence: new aggregator with 1 iteration matches old aggregator", async () => {
    const honestPeers = ["honest1", "honest2", "honest3"];
    const byzantinePeers = ["byzantine1", "byzantine2"];
    const allPeers = honestPeers.concat(byzantinePeers);

    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 50.0 })),
    ];

    const newAggWithOneIter = new ByzantineRobustAggregator(0, 5, "absolute", 1.0, 1, 0);
    newAggWithOneIter.setNodes(Set(allPeers));

    const oldAgg = new PercentileClippingAggregator(0, 5, "absolute", 0.1);
    oldAgg.setNodes(Set(allPeers));

    const timingNew = await measureAggregation(newAggWithOneIter, "New (maxIter=1)", peersWithValues);
    const timingOld = await measureAggregation(oldAgg, "Old (tau=0.1)", peersWithValues);

    console.log("\n=== Equivalence Test: Single Iteration Convergence ===");
    console.log(formatTiming([timingNew, timingOld]));
    console.log(`  Result difference: ${Math.abs(timingNew.result - timingOld.result).toFixed(4)}`);
    console.log(`  Speed ratio (new/old): ${(timingNew.time / timingOld.time).toFixed(2)}x`);

    expect(timingNew.result).toBeLessThan(30);
    expect(timingOld.result).toBeLessThan(30);
    
    // With single iteration, results should be very close (within reasonable tolerance)
    expect(Math.abs(timingNew.result - timingOld.result)).toBeLessThan(5);
  });

  it("byzantine robustness: high ratio attack (40% malicious peers)", async () => {
    const numHonest = 6;
    const numByzantine = 4;
    const honestPeers = Array.from({ length: numHonest }, (_, i) => `honest${i}`);
    const byzantinePeers = Array.from({ length: numByzantine }, (_, i) => `byzantine${i}`);
    const allPeers = honestPeers.concat(byzantinePeers);

    // Honest send gradient 1.0, Byzantine send large outlier
    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 100.0 })), // 40% Byzantine pulling result up
    ];

    const newAgg = new ByzantineRobustAggregator(0, allPeers.length, "absolute", 1.0, 1, 0);
    newAgg.setNodes(Set(allPeers));
    const timingNew = await measureAggregation(newAgg, "New (40% Byzantine)", peersWithValues);

    const oldAgg = new PercentileClippingAggregator(0, allPeers.length, "absolute", 0.1);
    oldAgg.setNodes(Set(allPeers));
    const timingOld = await measureAggregation(oldAgg, "Old (40% Byzantine)", peersWithValues);

    console.log("\n=== Byzantine Robustness: High Ratio Attack (4/10 = 40% malicious) ===");
    console.log(formatTiming([timingNew, timingOld]));
    console.log(`  Result gap: new=${timingNew.result.toFixed(4)}, old=${timingOld.result.toFixed(4)}`);
    console.log(`  Winner: ${timingNew.result < timingOld.result ? "NEW (closer to honest 1.0)" : "OLD (closer to honest 1.0)"}`);
  });

  it("byzantine robustness: gradient poisoning attack (crafted gradients)", async () => {
    // Byzantine gradient attack: send gradients designed to manipulate centroid
    const honestPeers = ["honest1", "honest2", "honest3"];
    const byzantinePeers = ["byzantine1", "byzantine2"];
    const allPeers = honestPeers.concat(byzantinePeers);

    // Honest: standard gradient 1.0
    // Byzantine: crafted to move result away from honest consensus
    // Poisoning strategy: send same large value to coordinate
    const peersWithValues = [
      ...honestPeers.map(id => ({ id, value: 1.0 })),
      ...byzantinePeers.map(id => ({ id, value: 10.0 })),
    ];

    const newAgg = new ByzantineRobustAggregator(0, allPeers.length, "absolute", 2.0, 5, 0);
    newAgg.setNodes(Set(allPeers));
    const timingNew = await measureAggregation(newAgg, "New (5 iterations)", peersWithValues);

    const oldAgg = new PercentileClippingAggregator(0, allPeers.length, "absolute", 0.2);
    oldAgg.setNodes(Set(allPeers));
    const timingOld = await measureAggregation(oldAgg, "Old (tau=0.2)", peersWithValues);

    console.log("\n=== Gradient Poisoning Attack (coordinated Byzantine values) ===");
    console.log(formatTiming([timingNew, timingOld]));
    console.log(`  Result gap: new=${timingNew.result.toFixed(4)}, old=${timingOld.result.toFixed(4)}`);
    console.log(`  Expected honest value: 1.0000`);
    console.log(`  Winner: ${Math.abs(timingNew.result - 1.0) < Math.abs(timingOld.result - 1.0) ? "NEW (closer to honest)" : "OLD (closer to honest)"}`);
  });

  it("byzantine robustness: adaptive multi-round attack", async () => {
    // Multi-round attack: Byzantine adapts based on previous aggregation
    // Round 1: test the aggregator behavior
    // Round 2: Byzantine sends crafted response gradient
    
    const honestPeers = ["honest1", "honest2", "honest3"];
    const byzantinePeers = ["byzantine1"];
    const allPeers = honestPeers.concat(byzantinePeers);

    // Round 1 setup
    const round1Values = [
      ...honestPeers.map(id => ({ id, value: 5.0 })),
      ...byzantinePeers.map(id => ({ id, value: 5.0 })), // Byzantine cooperates round 1
    ];

    const newAgg = new ByzantineRobustAggregator(0, allPeers.length, "absolute", 1.0, 5, 0);
    newAgg.setNodes(Set(allPeers));
    const timing1New = await measureAggregation(newAgg, "New Round 1", round1Values);

    const oldAgg = new PercentileClippingAggregator(0, allPeers.length, "absolute", 0.1);
    oldAgg.setNodes(Set(allPeers));
    const timing1Old = await measureAggregation(oldAgg, "Old Round 1", round1Values);

    // Round 2: Byzantine launches adaptive attack
    const round2Values = [
      ...honestPeers.map(id => ({ id, value: 10.0 })), // Honest update
      ...byzantinePeers.map(id => ({ id, value: 50.0 })), // Byzantine aggressive attack in round 2
    ];

    const timing2New = await measureAggregation(newAgg, "New Round 2 (attack)", round2Values);
    const timing2Old = await measureAggregation(oldAgg, "Old Round 2 (attack)", round2Values);

    console.log("\n=== Adaptive Multi-Round Attack ===");
    console.log("Round 1 (cooperation):");
    console.log(formatTiming([timing1New, timing1Old]));
    console.log("\nRound 2 (adaptive Byzantine attack):");
    console.log(formatTiming([timing2New, timing2Old]));
    console.log(`  New result: ${timing2New.result.toFixed(4)} (expected ~10.0)`);
    console.log(`  Old result: ${timing2Old.result.toFixed(4)} (expected ~10.0)`);
    console.log(`  Winner: ${Math.abs(timing2New.result - 10.0) < Math.abs(timing2Old.result - 10.0) ? "NEW (better rejects attack)" : "OLD (better rejects attack)"}`);
  });

  it("heterogeneous gradients: realistic multi-tensor federated model", async () => {
    // Realistic FL scenario: aggregate weights across multiple layers/tensors with different scales
    // Layer 1: large values (e.g., from first dense layer)
    // Layer 2: small values (e.g., from final output layer)
    
    const honestPeers = ["honest1", "honest2", "honest3", "honest4"];
    const byzantinePeers = ["byzantine1"];
    const allPeers = honestPeers.concat(byzantinePeers);

    // Create multi-tensor contributions
    const createHeterogeneousGradient = (baseValue: number): WeightsContainer => {
      return WeightsContainer.of([baseValue * 100, baseValue * 10, baseValue]); // Different scales
    };

    const newAgg = new ByzantineRobustAggregator(0, allPeers.length, "absolute", 5.0, 3, 0);
    newAgg.setNodes(Set(allPeers));
    const promiseNew = newAgg.getPromiseForAggregation();
    const startNew = performance.now();

    honestPeers.forEach(id => {
      newAgg.add(id, createHeterogeneousGradient(1.0), newAgg.round);
    });
    byzantinePeers.forEach(id => {
      newAgg.add(id, createHeterogeneousGradient(100.0), newAgg.round); // Byzantine
    });

    const resultNew = await promiseNew;
    const timeNew = performance.now() - startNew;
    const arrNew = await WSIntoArrays(resultNew);

    const oldAgg = new PercentileClippingAggregator(0, allPeers.length, "absolute", 0.1);
    oldAgg.setNodes(Set(allPeers));
    const promiseOld = oldAgg.getPromiseForAggregation();
    const startOld = performance.now();

    honestPeers.forEach(id => {
      oldAgg.add(id, createHeterogeneousGradient(1.0), oldAgg.round);
    });
    byzantinePeers.forEach(id => {
      oldAgg.add(id, createHeterogeneousGradient(100.0), oldAgg.round); // Byzantine
    });

    const resultOld = await promiseOld;
    const timeOld = performance.now() - startOld;
    const arrOld = await WSIntoArrays(resultOld);

    console.log("\n=== Heterogeneous Gradients: Multi-Tensor Federated Model ===");
    console.log("Gradient structure: [layer1=100×value, layer2=10×value, layer3=value]");
    console.log("Honest peers send: [100, 10, 1]");
    console.log("Byzantine sends: [10000, 1000, 100]");
    console.log(`\nNew aggregator (${timeNew.toFixed(2)}ms):`);
    console.log(`  Layer 1: ${arrNew[0][0].toFixed(2)} (expected ~100)`);
    console.log(`  Layer 2: ${arrNew[0][1].toFixed(2)} (expected ~10)`);
    console.log(`  Layer 3: ${arrNew[0][2].toFixed(2)} (expected ~1)`);
    console.log(`\nOld aggregator (${timeOld.toFixed(2)}ms):`);
    console.log(`  Layer 1: ${arrOld[0][0].toFixed(2)} (expected ~100)`);
    console.log(`  Layer 2: ${arrOld[0][1].toFixed(2)} (expected ~10)`);
    console.log(`  Layer 3: ${arrOld[0][2].toFixed(2)} (expected ~1)`);

    // Check relative error
    const newError = Math.abs((arrNew[0][0] - 100) / 100) + Math.abs((arrNew[0][1] - 10) / 10) + Math.abs(arrNew[0][2] - 1);
    const oldError = Math.abs((arrOld[0][0] - 100) / 100) + Math.abs((arrOld[0][1] - 10) / 10) + Math.abs(arrOld[0][2] - 1);
    console.log(`\nTotal relative error: new=${newError.toFixed(3)}, old=${oldError.toFixed(3)}`);
    console.log(`Winner: ${newError < oldError ? "NEW (better handles multi-scale)" : "OLD (better handles multi-scale)"}`);
  });
});
