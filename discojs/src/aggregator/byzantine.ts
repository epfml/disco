import { List, Map } from "immutable";
import * as tf from "@tensorflow/tfjs";

import type { NodeID } from "#client/types";
import { avg, WeightsContainer } from "#weights/index";

import { AggregationStep } from "#aggregator/aggregator";
import type { ThresholdType } from "#aggregator/multiround";
import { MultiRoundAggregator } from "#aggregator/multiround";

/**
 * Byzantine-robust aggregator using Centered Clipping (CC), based on the
 * "Learning from History for Byzantine Robust Optimization" paper: https://arxiv.org/abs/2012.10333
 *
 * This class implements Centered Clipping (Algorithm 1) with an additional
 * server-side per-client momentum mechanism inspired by Algorithm 2.
 *
 * The paper aggregates gradients while Disco nodes send their model weights.
 * We thus turn each contribution w_i into an update g_i = w_i - w^{t-1},
 * where w^{t-1} is the previous aggregate (the global model
 * every node started the round from).
 * The returned aggregate is w^{t-1} + v^t, 
 * with v^t = CC(m^t)
 * Momentum: m_i^t = (1 - β) g_i^t + β m_i^{t-1}
 
 * Initializations:
 * - m_i^t is initialized to m_i = g_i the first time node i contributes.
 *   If init to 0 then the next round momentum is damped by (1 - β)
 * - Centered Clipping is then performed on {m_i}, starting from
 *   the previous aggregated momentum v^{t-1} as its center
 * - CC previous aggregated momentum is initialized to 0 at first.
 * - At the first round, no previous aggregate exists yet: Centered Clipping is
 *   performed on the weights directly, starting from their mean, without momentum.
 *
 * WARNING:
 * This implementation requires stable client identities and is not
 * compatible with secure aggregation, since per-client momentum
 * must be tracked on the server.
 * Contributions from previous rounds (when roundCutoff > 0) are compared
 * to the latest aggregate rather than to the model they started from.
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
  private historyMomentums: Map<NodeID, WeightsContainer> = Map();
  // previous aggregate w^{t-1}, the reference model to compute updates from
  private prevAggregate: WeightsContainer | null = null;
  // previous aggregated momentum v^{t-1}, the initial center of Centered Clipping
  private prevAggregateMomentum: WeightsContainer | null = null;

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

  override _add(nodeId: NodeID, contribution: WeightsContainer): void {
    const previous = this.contributions.getIn([0, nodeId]) as
      | WeightsContainer
      | undefined;
    this.log(
      previous !== undefined ? AggregationStep.UPDATE : AggregationStep.ADD,
      nodeId,
    );
    // Momentums are only updated when aggregating, so that
    // a node updating its contribution doesn't count twice
    previous?.dispose();
    this.contributions = this.contributions.setIn(
      [0, nodeId],
      contribution.clone(),
    );
  }

  override aggregate(): WeightsContainer {
    const currentContributions = this.contributions.get(0);
    if (!currentContributions)
      throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    // Forget the momentums of nodes that are no longer part of the aggregation
    this.historyMomentums
      .filter((_, nodeId) => !this.nodes.has(nodeId))
      .forEach((momentum) => momentum.dispose());
    this.historyMomentums = this.historyMomentums.filter((_, nodeId) =>
      this.nodes.has(nodeId),
    );

    const reference = this.prevAggregate;
    if (reference === null) {
      // first round: no reference model to compute updates from
      // so only apply centered clipping and
      // return their average without momentum
      const contributions = List(currentContributions.values());
      const center = avg(contributions);
      // CC on weights with center set to their average
      const aggregate = this.centeredClipping(contributions, center);
      center.dispose();

      this.prevAggregate = aggregate.clone();
      return aggregate;
    }

    // Step 1: Update each node's momentum with its model update
    currentContributions.forEach((weights, nodeId) => {
      const update = weights.sub(reference);
      const prevMomentum = this.historyMomentums.get(nodeId);
      if (prevMomentum === undefined) {
        // second round, momentum init to first update
        this.historyMomentums = this.historyMomentums.set(nodeId, update);
        return;
      }
      // update momentum with an exponential moving average starting round 2
      const momentum = update.mapWith(prevMomentum, (g, m) =>
        tf.tidy(() => g.mul(1 - this.beta).add(m.mul(this.beta))),
      );
      update.dispose();
      prevMomentum.dispose();
      this.historyMomentums = this.historyMomentums.set(nodeId, momentum);
    });
    const momentums = List(currentContributions.keys()).map((nodeId) => {
      const momentum = this.historyMomentums.get(nodeId);
      if (momentum === undefined) throw new Error("missing node momentum");
      return momentum;
    });

    // Step 2: Centered Clipping of the momentums around the previous aggregated momentum
    const center =
      this.prevAggregateMomentum ?? reference.map((w) => tf.zerosLike(w));
    // CC on momentums with center set to last round's value
    const aggregateMomentum = this.centeredClipping(momentums, center); // v^t = CC(m^t)
    if (center !== this.prevAggregateMomentum) center.dispose();

    // Step 3: Apply the aggregated update and update history
    const aggregate = reference.add(aggregateMomentum); // w^{t-1} + v^t
    this.prevAggregateMomentum?.dispose();
    this.prevAggregateMomentum = aggregateMomentum;
    // Keep our own copy, the returned aggregate is owned (and disposed) by the caller
    reference.dispose();
    this.prevAggregate = aggregate.clone();
    return aggregate;
  }

  /**
   * Iterative Centered Clipping of the given points, starting from `center`.
   * Neither the points nor the center are disposed.
   */
  private centeredClipping(
    points: List<WeightsContainer>,
    center: WeightsContainer,
  ): WeightsContainer {
    // If clipping radius is infinite, fall back to simple mean
    if (!isFinite(this.clippingRadius)) return avg(points);

    let v = center.clone(); // Clone to avoid in-place modifications
    for (let l = 0; l < this.maxIterations; l++) {
      // Clip one point at a time so that the unclipped diff is freed
      // right away rather than keeping all of them alive until the end
      const clippedDiffs = points.map(
        (m) =>
          new WeightsContainer(
            tf.tidy(() => {
              const diff = m.sub(v);
              const safeNorm = tf.maximum(euclideanNorm(diff), 1e-12);
              const scale = tf.minimum(
                1,
                tf.div(this.clippingRadius, safeNorm),
              );
              return diff.mul(scale).weights;
            }),
          ),
      );

      const avgClip = avg(clippedDiffs);
      clippedDiffs.forEach((d) => d.dispose());
      const newV = v.add(avgClip);
      avgClip.dispose();

      v.dispose();
      v = newV;
    }

    return v;
  }

  override removeNode(nodeId: NodeID): void {
    super.removeNode(nodeId);
    this.historyMomentums.get(nodeId)?.dispose();
    this.historyMomentums = this.historyMomentums.delete(nodeId);
  }

  override dispose(): void {
    this.historyMomentums.forEach((momentum) => momentum.dispose());
    this.historyMomentums = Map();
    this.prevAggregate?.dispose();
    this.prevAggregate = null;
    this.prevAggregateMomentum?.dispose();
    this.prevAggregateMomentum = null;
    super.dispose();
  }

  override makePayloads(
    weights: WeightsContainer,
  ): Map<NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights.clone());
  }
}

function euclideanNorm(w: WeightsContainer): tf.Scalar {
  // Computes the Euclidean (L2) norm of all tensors in a WeightsContainer by summing the squares of their elements and taking the square root.
  return tf.tidy(() => {
    const squaredSums = w.weights.map((t) => tf.sum(tf.square(t)));
    const total = tf.addN(squaredSums);
    return tf.sqrt(total) as tf.Scalar;
  });
}
