import type { Map } from "immutable";
import { AggregationStep } from "./aggregator.js";
import { MultiRoundAggregator, ThresholdType } from "./multiround.js";
import { aggregation } from "../index.js";
import type { WeightsContainer, client } from "../index.js";

/**
 * Mean aggregator whose aggregation step consists in computing the mean of the received weights.
 * This aggregator extends MultiRoundAggregator while only performing a single round
 *
 */
export class MeanAggregator extends MultiRoundAggregator {
  /**
   * Create a mean aggregator that averages all weight updates received when a specified threshold is met.
   * By default, initializes an aggregator that waits for 100% of the nodes' contributions and that
   * only accepts contributions from the current round (drops contributions from previous rounds).
   */
  constructor(roundCutoff = 0, threshold = 1, thresholdType?: ThresholdType) {
    super(roundCutoff, threshold, thresholdType);
  }

  override _add(nodeId: client.NodeID, contribution: WeightsContainer): void {
    const previous = this.contributions.getIn([0, nodeId]) as
      | WeightsContainer
      | undefined;
    this.log(
      this.contributions.hasIn([0, nodeId])
        ? AggregationStep.UPDATE
        : AggregationStep.ADD,
      nodeId,
    );
    if (previous !== undefined) previous.dispose();
    this.contributions = this.contributions.setIn(
      [0, nodeId],
      contribution.map((weight) => weight.clone()),
    );
  }

  override aggregate(): WeightsContainer {
    const currentContributions = this.contributions.get(0);
    if (!currentContributions)
      throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    const contributions = Array.from(currentContributions.values());
    const avg = aggregation.avg(contributions);
    contributions.forEach((contribution) => contribution.dispose());
    return avg
  }

  override makePayloads(
    weights: WeightsContainer,
  ): Map<client.NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights);
  }
}
