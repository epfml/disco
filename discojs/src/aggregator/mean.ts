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
   * @param roundCutoff - from how many past rounds do we still accept contributions. 
   * If 0 then only accept contributions from the current round, 
   * if 1 then the current round and the previous one, etc.
   * @param threshold - how many contributions for trigger an aggregation step.
   *   - relative: 0 < t < 1, requiring t * |nodes| contributions
   *   - absolute: t >= 1, requiring t contributions
   * @param thresholdType 'relative' or 'absolute', is only used to clarify the case when threshold = 1, 
   * If threshold != 1 then the specifying thresholdType is ignored and overwritten
   * If thresholdType = 'absolute' and then threshold = 1 means waiting for 1 contribution
   * if thresholdType = 'relative' then threshold = 1 means 100% of the contributions, 
   * i.e., waiting for a contribution from every nodes
   */
  constructor(model?: Model, roundCutoff = 0, threshold = 1, thresholdType: ThresholdType = 'absolute') {
    if (threshold <= 0) throw new Error("threshold must be strictly positive");
    if (threshold > 1 && (!Number.isInteger(threshold) || thresholdType != 'absolute'))
      throw new Error("absolute thresholds must be integral");

  
    super(model, roundCutoff, 1);
    this.#threshold = threshold;
    
    if (threshold < 1) this.#thresholdType = 'relative'
    else if (threshold > 1) this.#thresholdType = 'absolute'
    else this.#thresholdType = thresholdType;
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
