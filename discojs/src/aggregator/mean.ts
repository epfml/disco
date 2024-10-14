import createDebug from "debug";
import type { Map } from "immutable";

import { AggregationStep, Aggregator } from "./aggregator.js";
import type { WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

const debug = createDebug("discojs:aggregator:mean");

type ThresholdType = 'relative' | 'absolute'

/** 
 * Mean aggregator whose aggregation step consists in computing the mean of the received weights. 
 * 
 */
export class MeanAggregator extends Aggregator {
  readonly #threshold: number;
  readonly #thresholdType: ThresholdType;
  #minNbOfParticipants: number | undefined;

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
  constructor(roundCutoff = 0, threshold = 1, thresholdType?: ThresholdType) {
    if (threshold <= 0) throw new Error("threshold must be strictly positive");
    if (threshold > 1 && (!Number.isInteger(threshold)))
      throw new Error("absolute thresholds must be integral");
    
    
    super(roundCutoff, 1);
    this.#threshold = threshold;

    if (threshold < 1) {
      // Throw exception if threshold and thresholdType are conflicting
      if (thresholdType === 'absolute') {
        throw new Error(`thresholdType has been set to 'absolute' but choosing threshold=${threshold} implies that thresholdType should be 'relative'.`)
      }
      this.#thresholdType = 'relative'
    }
    else if (threshold > 1) {
      // Throw exception if threshold and thresholdType are conflicting
      if (thresholdType === 'relative') {
        throw new Error(`thresholdType has been set to 'relative' but choosing threshold=${threshold} implies that thresholdType should be 'absolute'.`)
      }
      this.#thresholdType = 'absolute'
    }
    // remaining case: threshold == 1
    else {
      // Print a warning regarding the default behavior when thresholdType is not specified
      if (thresholdType === undefined) {
        // TODO enforce validity by splitting the different threshold types into separate classes instead of warning
        debug(
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
    // Make sure that we are over the minimum number of participants
    // if specified
    if (this.#minNbOfParticipants !== undefined &&
      this.nodes.size < this.#minNbOfParticipants) return false

    const thresholdValue =
      this.#thresholdType == 'relative'
        ? this.#threshold * this.nodes.size
        : this.#threshold;

    return (this.contributions.get(0)?.size ?? 0) >= thresholdValue;
  }

  set minNbOfParticipants(minNbOfParticipants: number) {
    this.#minNbOfParticipants = minNbOfParticipants
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
    if (currentContributions === undefined)
      throw new Error("aggregating without any contribution");

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
