import { Map } from "immutable";
import * as tf from '@tensorflow/tfjs';
import { AggregationStep } from "./aggregator.js";
import { MultiRoundAggregator, ThresholdType } from "./multiround.js";
import type { WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

/**
 * Byzantine-robust aggregator using Centered Clipping (CC), based on the
 * "Learning from History for Byzantine Robust Optimization" paper: https://arxiv.org/abs/2012.10333
 * 
 * This class implements a gradient aggregation rule that clips updates
 * in an iterative fashion to mitigate the influence of Byzantine nodes, as well as momentum calculations.
 */
export class ByzantineRobustAggregator extends MultiRoundAggregator {
  private readonly clippingRadius: number;
  private readonly maxIterations: number;
  private readonly beta: number;
  private momentums: Map<client.NodeID, WeightsContainer> = Map();

  /** 
  @property clippingRadius The clipping threshold (λ) used to limit the influence of outlier updates.
 *   - Type: `number`
 *   - Determines the maximum norm allowed for the difference between a client update and the current estimate.
 *   - Used in the Centered Clipping step to compute a scaling factor for updates.
 *   - Smaller values clip more aggressively.
 *   - Default value is 1.0.
 *
 * @property maxIterations The number of iterations (L) to run the Centered Clipping update loop.
 *   - Type: `number`
 *   - Controls how many refinement steps are used to compute the final aggregate `v`.
 *   - Default value is 1.
 * * @property beta The momentum coefficient used to smooth the aggregation over multiple rounds.
 *   - Type: `number`
 *   - Must be between 0 and 1.
 *   - Used to compute the exponential moving average of past aggregates (i.e., momentum vector).
 *     The update typically looks like: `v_t = beta * v_{t-1} + (1 - beta) * g_t`, where `g_t` is the current clipped average.
 *   - A higher beta gives more weight to past rounds (more smoothing), while a lower beta makes the aggregator more responsive to new updates.
 */


  constructor(roundCutoff = 0, threshold = 1, thresholdType?: ThresholdType, clippingRadius = 1.0, maxIterations = 1, beta = 0.9) {
    super(roundCutoff, threshold, thresholdType);
    if (clippingRadius <= 0) throw new Error("Clipping radius needs to be positive number > 0.");
    if (maxIterations < 1) throw new Error("There must be at least one iteration for clipping.");
    if (!Number.isInteger(maxIterations)) throw new Error("Number of iterations must be intiger value.");
    if ((beta < 0) || (beta > 1)) throw new Error("Beta must be between 0 and 1, since it is coeficient.");
    this.clippingRadius = clippingRadius;
    this.maxIterations = maxIterations;
    this.beta = beta;
  }

  override _add(nodeId: client.NodeID, contribution: WeightsContainer): void {
    this.log(
      this.contributions.hasIn([0, nodeId]) ? AggregationStep.UPDATE : AggregationStep.ADD,
      nodeId,
    );

    const prevMomentum = this.momentums.get(nodeId);
    const momentum = prevMomentum
      ? contribution.mapWith(prevMomentum, (g, m) => g.mul(1 - this.beta).add(m.mul(this.beta)))
      : contribution.map(g => g.mul(1 - this.beta));

    this.momentums = this.momentums.set(nodeId, momentum);
    this.contributions = this.contributions.setIn([0, nodeId], momentum);
  }

  // override aggregate(): WeightsContainer {
  //   const currentContributions = this.contributions.get(0);
  //   if (!currentContributions) throw new Error("aggregating without any contribution");

  //   this.log(AggregationStep.AGGREGATE);

  //   if (!isFinite(this.clippingRadius)) {
  //     return aggregation.avg(currentContributions.values()); // Identity fallback for large radius
  //   }

  //   // Step 1: initialize v to average of momentum
  //   let v = aggregation.avg(currentContributions.values());

  //   // Step 2: Iterate Centered Clipping 
  //   // for (let l = 0; l < this.maxIterations; l++) {
  //   //   const clippedDiffs = Array.from(currentContributions.values()).map(m => {
  //   //     const diff = m.sub(v);
  //   //     const norm = euclideanNorm(diff);
  //   //     const scale = tf.tidy(() => tf.minimum(tf.scalar(1), tf.div(tf.scalar(this.clippingRadius), norm)));
  //   //     return diff.mul(scale);
  //   //   });

  //   //   const avgClip = aggregation.avg(clippedDiffs);
  //   //   v = v.add(avgClip.mul(1 / currentContributions.size));
  //   // }

  //   for (let l = 0; l < this.maxIterations; l++) {
  //     const clippedDiffs = Array.from(currentContributions.values()).map(m => tf.tidy(() => {
  //       const diff = m.sub(v);
  //       const norm = euclideanNorm(diff);
  //       const scale = tf.minimum(tf.scalar(1), tf.div(tf.scalar(this.clippingRadius), norm));
  //       return diff.mul(scale);
  //     }));

  //     const avgClip = aggregation.avg(clippedDiffs);
  //     v = tf.tidy(() => v.add(avgClip));
  //     clippedDiffs.forEach(d => d.dispose());
  //   }

  //   return v;
  // }

  override aggregate(): WeightsContainer {
    const currentContributions = this.contributions.get(0);
    if (!currentContributions) throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    // If clipping radius is infinite, fall back to simple mean
    if (!isFinite(this.clippingRadius)) {
      return aggregation.avg(currentContributions.values());
    }

    // Step 1: Initialize v to average of momentums
    let v = aggregation.avg(currentContributions.values());

    // Step 2: Iterative Centered ClippingF
    for (let l = 0; l < this.maxIterations; l++) {
      const clippedDiffs = Array.from(currentContributions.values()).map(m => {
        const diff = m.sub(v);
        const norm = tf.tidy(() => euclideanNorm(diff));
        const scale = tf.tidy(() => tf.minimum(tf.scalar(1), tf.div(tf.scalar(this.clippingRadius), norm)));
        const clipped = diff.mul(scale);
        norm.dispose(); scale.dispose();
        return clipped;
      });

      const avgClip = aggregation.avg(clippedDiffs);
      const newV = v.add(avgClip);
      clippedDiffs.forEach(d => d.dispose());
      v.dispose(); // Safe if v is no longer needed
      v = newV;
    }
    return v;
  }


  override makePayloads(weights: WeightsContainer): Map<client.NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights);
  }
}

function euclideanNorm(w: WeightsContainer): tf.Scalar {
  // Computes the Euclidean (L2) norm of all tensors in a WeightsContainer by summing the squares of their elements and taking the square root.
  return tf.tidy(() => {
    const norms = w.weights.map(t => tf.sum(tf.square(t)) as tf.Scalar);
    const total = norms.reduce((a, b) => tf.add(a, b)) as tf.Scalar;
    return tf.sqrt(total);
  });
}