import { Map } from "immutable";
import * as tf from '@tensorflow/tfjs';
import { AggregationStep } from "./aggregator.js";
import { MultiRoundAggregator, ThresholdType } from "./multiround.js";
import { WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

/**
 * Percentile-based clipping aggregator.
 * 
 * This method clips updates using a threshold τ computed as a percentile
 * of update norms. Unlike Centered Clipping, this is a single-pass heuristic
 * and does not provide formal Byzantine robustness guarantees.
 * 
 * Use Case:
 * Suitable for mitigating mild outliers or noisy updates when most clients
 * are honest. Not suitable for adversarial Byzantine settings, as the
 * percentile threshold can be influenced by malicious clients.
 * 
 * Algorithm:
 * 1. Center all peer weights w.r.t. the previous aggregation
 * 2. Compute Frobenius norm for each centered weight
 * 3. Compute tau as the percentile of the norm array
 * 4. Clip each centered weight: clip = centeredWeight * min(1, tau / norm)
 * 5. Average all clipped weights
 */

export class PercentileClippingAggregator extends MultiRoundAggregator {
  private readonly tauPercentile: number;
  private prevAggregate: WeightsContainer | null = null;

  /** 
   * @property tauPercentile The percentile (0 < tau < 1) used to compute the clipping threshold.
   *   - Type: `number`
   *   - Determines which percentile of the Frobenius norms to use as the clipping threshold.
   *   - For example, 0.1 clips at the 10th percentile of norms.
   *   - Smaller values are more aggressive (clip more updates).
   *   - Default value is 0.1.
   */

  constructor(roundCutoff = 0, threshold = 1, thresholdType?: ThresholdType, tauPercentile = 0.1) {
    super(roundCutoff, threshold, thresholdType);
    if (tauPercentile <= 0 || tauPercentile >= 1) {
      throw new Error("Tau percentile must be between 0 and 1 (exclusive).");
    }
    this.tauPercentile = tauPercentile;
  }

  override _add(nodeId: client.NodeID, contribution: WeightsContainer): void {
    this.log(
      this.contributions.hasIn([0, nodeId]) ? AggregationStep.UPDATE : AggregationStep.ADD,
      nodeId,
    );
    // Store contribution as is, without client-side momentum
    this.contributions = this.contributions.setIn([0, nodeId], contribution);
  }

  override aggregate(): WeightsContainer {
    const currentContributions = this.contributions.get(0);
    if (!currentContributions || currentContributions.size === 0) throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    // Step 1: Get the centering reference (previous aggregation or initial avg vector)
    let centerReference: WeightsContainer;
    if (this.prevAggregate) {
      centerReference = this.prevAggregate.map(t => tf.clone(t));
    } else {
      centerReference = aggregation.avg(currentContributions.values()).map(t => tf.clone(t));
    }

    // Step 2: Center the weights with respect to the reference
    const centeredWeights = Array.from(currentContributions.values()).map(w =>
      w.sub(centerReference)
    );

    // Step 3: Compute Frobenius norms for each centered weight
    const normArray = centeredWeights.map(w => frobeniusNorm(w));

    // Step 4: Compute tau as the percentile of the norm array
    const tau = this.computePercentile(normArray, this.tauPercentile);

    // Step 5: Clip weights based on tau
    // Each peer gets one scale factor based on their Frobenius norm
    const clippedWeights = centeredWeights.map((w, peerIdx) => {
      const norm = normArray[peerIdx];
      const safeNorm = Math.max(norm, 1e-12);

      const scaleFactor = Math.min(1, tau / safeNorm);
      return w.map((t: tf.Tensor) => t.mul(scaleFactor));
    });

    centeredWeights.forEach(w => w.dispose());

    // Step 6: Average the clipped weights and add back the reference
    const clippedAvg = aggregation.avg(clippedWeights);
    const result = centerReference.add(clippedAvg);

    centerReference.dispose();
    clippedWeights.forEach(w => w.dispose());
    clippedAvg.dispose();

    // Step 7: Store result for next round
    this.prevAggregate = result;
    return result;
  }

  private computePercentile(array: number[], percentile: number): number {
    // Linear interpolation for percentile calculation
    const clean = array.filter(Number.isFinite);
    if (clean.length === 0) return 0;

    const sorted = [...clean].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * percentile;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  override makePayloads(weights: WeightsContainer): Map<client.NodeID, WeightsContainer> {
    return this.nodes.toMap().map(() => weights);
  }
}

function frobeniusNorm(w: WeightsContainer): number {
  // Computes the Frobenius (L2) norm of all tensors in a WeightsContainer
  return tf.tidy(() => {
    const total = w.weights
      .map(t => tf.sum(tf.square(t)))
      .reduce((a, b) => tf.add(a, b), tf.scalar(0));

    return tf.sqrt(total).dataSync()[0];
  });
}
