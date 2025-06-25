import type { WeightsContainer, client } from "../index.js";
import { SecureAggregator } from "./secure.js"; 
import * as tf from "@tensorflow/tfjs";
import { aggregation } from "../index.js";

export class SecureHistoryAggregator extends SecureAggregator {
  private prevAggregate: WeightsContainer | null = null;
  private readonly beta: number;

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
    if (!currentContributions) throw new Error("aggregating without any contribution");

    const avg = aggregation.avg(currentContributions.values());

    if (this.prevAggregate === null) {
      this.prevAggregate = avg;
      return avg;
    }

    const updatedMomentum = this.prevAggregate.mapWith(avg, (prevT, currT) =>
      prevT.mul(this.beta).add(currT.mul(1 - this.beta))
    );

    // Dispose old tensors to avoid memory leaks
    this.prevAggregate.weights.forEach(t => t.dispose());
    this.prevAggregate = updatedMomentum;

    return updatedMomentum;
  }
}
