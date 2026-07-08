import { Map } from "immutable";
import * as tf from "@tensorflow/tfjs";
import { AggregationStep } from "./aggregator.js";
import { MultiRoundAggregator, ThresholdType } from "./multiround.js";
import { WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

/**
 * Byzantine-robust aggregator using Centered Clipping (CC), based on the
 * "Learning from History for Byzantine Robust Optimization" paper: https://arxiv.org/abs/2012.10333
 * 
 * This class implements Centered Clipping (Algorithm 1) with an additional
 * server-side per-client momentum mechanism inspired by Algorithm 2.
 * 
 * We initialize using the mean of contributions when no previous
 * aggregate exists. This improves convergence compared to zero initialization.
 *
 * NOTE:
 * - Momentum:
 *     m_i^t = (1 - β) g_i^t + β m_i^{t-1}
 * - Aggregation is then performed on {m_i}
 * 
 * WARNING:
 * This implementation requires stable client identities and is not
 * compatible with secure aggregation, since per-client momentum
 * must be tracked on the server.
 * 
 * Use Case:
 * 
 * Designed for federated or distributed learning with potentially malicious
 * (Byzantine) clients. Centered Clipping limits the influence of extreme or
 * corrupted updates by bounding each client's contribution.
 * 
 * CC alone can be sensitive to poor initialization (e.g., early extreme
 * Byzantine updates), as clipping limits updates but does not correct a
 * bad initial estimate. The added per-client momentum helps stabilize
 * training over time by leveraging historical information.
 * 
 */
export class ByzantineRobustAggregator extends MultiRoundAggregator {
  private readonly clippingRadius: number;
  private readonly maxIterations: number;
  private readonly beta: number;
  private historyMomentums: Map<client.NodeID, WeightsContainer> = Map();
  private prevAggregate: WeightsContainer | null = null;

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
 *     The update typically looks like: `m_i^t = (1 - β) g_i^t + β m_i^{t-1}`.
 *   - A higher beta gives more weight to past rounds (more smoothing), while a lower beta makes the aggregator more responsive to new updates.
 */

  constructor(
    roundCutoff = 0,
    threshold = 1,
    thresholdType?: ThresholdType,
    clippingRadius = 1.0,
    maxIterations = 1,
    beta = 0.9,
  ) {
    super(roundCutoff, threshold, thresholdType);
    if (clippingRadius <= 0)
      throw new Error("Clipping radius needs to be positive number > 0.");
    if (maxIterations < 1)
      throw new Error("There must be at least one iteration for clipping.");
    if (!Number.isInteger(maxIterations))
      throw new Error("Number of iterations must be an integer.");
    if (beta < 0 || beta > 1)
      throw new Error("Beta must be between 0 and 1, since it is coeficient.");
    this.clippingRadius = clippingRadius;
    this.maxIterations = maxIterations;
    this.beta = beta;
  }

  override _add(nodeId: client.NodeID, contribution: WeightsContainer): void {
    this.log(
      this.contributions.hasIn([0, nodeId])
        ? AggregationStep.UPDATE
        : AggregationStep.ADD,
      nodeId,
    );

    const prevMomentum = this.historyMomentums.get(nodeId);
    const newMomentum = prevMomentum
      ? contribution.mapWith(prevMomentum, (g, m) => g.mul(1 - this.beta).add(m.mul(this.beta)))
      : contribution.map(g => g.mul(1 - this.beta));

    this.historyMomentums = this.historyMomentums.set(nodeId, newMomentum);
    this.contributions = this.contributions.setIn([0, nodeId], newMomentum);
  }

  override aggregate(): WeightsContainer {
    const currentContributions = this.contributions.get(0);
    if (!currentContributions)
      throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    // If clipping radius is infinite, fall back to simple mean
    if (!isFinite(this.clippingRadius)) {
      return aggregation.avg(currentContributions.values());
    }

    // Step 1: Initialize v using previous aggregate or mean of contributions
    let v: WeightsContainer;
    if (this.prevAggregate) {
      v = this.prevAggregate.map(t => tf.clone(t)); // Clone to avoid in-place modifications
    } else {
      v = aggregation.avg(currentContributions.values());
    }

    const eps = tf.scalar(1e-12);
    const one = tf.scalar(1);
    const radius = tf.scalar(this.clippingRadius);

    // Step 2: Iterative Centered Clipping
    for (let l = 0; l < this.maxIterations; l++) {
      const clippedDiffs = Array.from(currentContributions.values()).map(m => {
        const diff = m.sub(v);

        const norm = euclideanNorm(diff);

        const safeNorm = tf.maximum(norm, eps);

        const scale = tf.minimum(
          one,
          tf.div(radius, safeNorm)
        );

        const clipped = diff.mul(scale);

        norm.dispose();
        safeNorm.dispose();
        scale.dispose();

        return clipped;
      });

      const avgClip = aggregation.avg(clippedDiffs);
      const newV = v.add(avgClip);

      clippedDiffs.forEach(d => d.dispose());

      const oldV = v;
      v = newV;
      oldV.dispose();
    }

    tf.dispose([eps, one, radius]);
    // Step 3: Update history
    this.prevAggregate = v;
    return v;
  }

  override makePayloads(
    weights: WeightsContainer,
  ): Map<client.NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights);
  }
}

function euclideanNorm(w: WeightsContainer): tf.Scalar {
  // Computes the Euclidean (L2) norm of all tensors in a WeightsContainer by summing the squares of their elements and taking the square root.
  return tf.tidy(() => {
    const squaredSums = w.weights.map(t => tf.sum(tf.square(t)));
    const total = tf.addN(squaredSums);
    return tf.sqrt(total) as tf.Scalar;
  });
}
