import type { Map } from "immutable";

import { AggregationStep, Base as Aggregator } from "./base.js";
import type { Model, WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

type ThresholdType = 'relative' | 'absolute'

/** 
 * Mean aggregator whose aggregation step consists in computing the mean of the received weights. 
 * 
 */
export class MeanAggregator extends Aggregator<WeightsContainer> {
  readonly #threshold: number;
  readonly #thresholdType: ThresholdType;

  /**
   * Create a mean aggregator that averages all weight updates received when a specified threshold is met.
   * By default, initializes an aggregator that waits for 100% of the nodes' contributions and that
   * only accepts contributions from the current round (drops contributions from previous rounds).
   * 
   * @param threshold - how many contributions trigger an aggregation step.
   * It can be relative (a proportion): 0 < t <= 1, requiring t * |nodes| contributions. 
   * Important: to specify 100% of the nodes, set `threshold = 1` and `thresholdType = 'relative'`.
   * It can be an absolute number, if t >=1 (then t has to be an integer), the aggregator waits fot t contributions
   * Note, to specify waiting for a single contribution (such as a federated client only waiting for the server weight update),
   * set `threshold = 1` and `thresholdType = 'absolute'`
   * @param thresholdType 'relative' or 'absolute', defaults to 'relative'. Is only used to clarify the case when threshold = 1, 
   * If `threshold != 1` then the specified thresholdType is ignored and overwritten
   * If `thresholdType = 'absolute'` then `threshold = 1` means waiting for 1 contribution
   * if `thresholdType = 'relative'` then `threshold = 1`` means 100% of this.nodes' contributions, 
   * @param roundCutoff - from how many past rounds do we still accept contributions. 
   * If 0 then only accept contributions from the current round, 
   * if 1 then the current round and the previous one, etc.
   */
  constructor(model?: Model, roundCutoff = 0, threshold = 1, thresholdType?: ThresholdType) {
    if (threshold <= 0) throw new Error("threshold must be strictly positive");
    if (threshold > 1 && (!Number.isInteger(threshold)))
      throw new Error("absolute thresholds must be integral");
    
    
    super(model, roundCutoff, 1);
    this.#threshold = threshold;

    if (threshold < 1) {
      // Print a warning if threshold and thresholdType are conflicting
      if (thresholdType === 'absolute') {
        console.warn(
          "[WARN] Changing the aggregator's thresholdType from 'absolute' to 'relative' because threshold < 1. " +
          `Make sure that the aggregator is indeed only expecting ${threshold * 100}% of the node's contributions.`
        )
      }
      this.#thresholdType = 'relative'
    }
    else if (threshold > 1) {
      // Print a warning if threshold and thresholdType are conflicting
      if (thresholdType === 'relative') {
        console.warn(
          "[WARN] Changing the aggregator's thresholdType from 'absolute' to 'relative' because threshold < 1 " +
          `Make sure that the aggregator is indeed only expecting ${threshold} contributions.`
        )
      }
      this.#thresholdType = 'absolute'
    }
    // remaining case: threshold == 1
    else {
      // Print a warning regarding the default behavior when thresholdType is not specified
      if (thresholdType === undefined) {
        console.warn(
          "[WARN] Setting the aggregator's threshold to 100% of the nodes' contributions by default. " +
          "To instead wait for a single contribution, set thresholdType = 'absolute'"
        )
        this.#thresholdType = 'relative'
      } else {
        this.#thresholdType = thresholdType
      }
    }
  }

  /** Checks whether the contributions buffer is full. */
  override isFull(): boolean {
    const thresholdValue =
      this.#thresholdType == 'relative'
        ? this.#threshold * this.nodes.size
        : this.#threshold;

    return (this.contributions.get(0)?.size ?? 0) >= thresholdValue;
  }

  override add(
    nodeId: client.NodeID,
    contribution: WeightsContainer,
    round: number,
    currentContributions: number = 0,
  ): boolean {
    if (currentContributions !== 0)
      throw new Error("only a single communication round");

    if (!this.nodes.has(nodeId) || !this.isWithinRoundCutoff(round))
      return false;

    this.log(
      this.contributions.hasIn([0, nodeId])
        ? AggregationStep.UPDATE
        : AggregationStep.ADD,
      nodeId,
    );

    this.contributions = this.contributions.setIn([0, nodeId], contribution);

    this.informant?.update();
    if (this.isFull()) this.aggregate();

    return true;
  }

  override aggregate(): void {
    const currentContributions = this.contributions.get(0);
    if (currentContributions === undefined)
      throw new Error("aggregating without any contribution");

    this.log(AggregationStep.AGGREGATE);

    const result = aggregation.avg(currentContributions.values());

    if (this.model !== undefined) this.model.weights = result;
    this.emit(result);
  }

  override makePayloads(
    weights: WeightsContainer,
  ): Map<client.NodeID, WeightsContainer> {
    // Communicate our local weights to every other node, be it a peer or a server
    return this.nodes.toMap().map(() => weights);
  }
}
