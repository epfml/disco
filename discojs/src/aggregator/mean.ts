import type { Map } from "immutable";
import { AggregationStep } from "./aggregator.js";
import { MultiRoundAggregator, ThresholdType } from "./multiround.js";
import type { WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

/** 
 * Mean aggregator whose aggregation step consists in computing the mean of the received weights. 
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
    this.log(
      this.contributions.hasIn([0, nodeId]) ? AggregationStep.UPDATE : AggregationStep.ADD,
      nodeId,
    );
    this.contributions = this.contributions.setIn([0, nodeId], contribution);
  }

  override aggregate(): WeightsContainer {
    const currentContributions = this.contributions.get(0);
    if (!currentContributions) throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    const result = aggregation.avg(currentContributions.values());
    return result;
  }

  override makePayloads(
    weights: WeightsContainer,
  ): Map<client.NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights);
  }
}
