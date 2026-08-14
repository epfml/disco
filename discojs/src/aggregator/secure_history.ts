import type { WeightsContainer } from "#weights/index";
import { avg } from "#weights/index";

import { SecureAggregator } from "#aggregator/secure";

/**
 * Aggregator that implements secure multi-party computation with history-based momentum smoothing.
 * It aggregates contributions in two communication rounds:
 * - In the first round, nodes send their secret shares to each other.
 * - In the second round, they sum their received shares and communicate the result.
 * Finally, nodes average the received partial sums to establish the aggregation result.
 * This aggregator also applies momentum smoothing based on the previous aggregation result.
 * It uses a beta parameter to control the smoothing effect.
 * The first aggregation round uses the average of contributions, while subsequent rounds apply momentum smoothing.
 * This allows for a more stable aggregation result over time, reducing the impact of outliers.
 * * @extends SecureAggregator
 * * @example
 * const aggregator = new SecureHistoryAggregator(100, 0.9);
 */

export class SecureHistoryAggregator extends SecureAggregator {
  private prevAggregate: WeightsContainer | null = null;
  private readonly beta: number;

  /**
   * @param maxShareValue - The maximum value for each share.
   * @param beta - The momentum smoothing factor (0 < beta < 1).
   */

  constructor(maxShareValue = 100, beta = 0.9) {
    super(maxShareValue);
    this.beta = beta;
    this.prevAggregate = null;
  }

  override aggregate(): WeightsContainer {
    // Call the base class aggregate for rounds other than 1
    if (this.communicationRound !== 1) {
      return super.aggregate();
    }

    // For communication round 1, do average + momentum smoothing
    const currentContributions = this.contributions.get(1);
    if (!currentContributions)
      throw new Error("aggregating without any contribution");

    const contribAvg = avg(currentContributions.values());

    if (this.prevAggregate === null) {
      this.prevAggregate = contribAvg;
      return contribAvg;
    }

    const updatedMomentum = this.prevAggregate.mapWith(
      contribAvg,
      (prevT, currT) => prevT.mul(this.beta).add(currT.mul(1 - this.beta)),
    );

    // Dispose old tensors to avoid memory leaks
    this.prevAggregate.weights.forEach((t) => t.dispose());
    this.prevAggregate = updatedMomentum;

    return updatedMomentum;
  }
}
