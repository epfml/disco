import type { Map } from "immutable";

import { AggregationStep, Base as Aggregator } from "./base.js";
import type { Model, WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

/** Mean aggregator whose aggregation step consists in computing the mean of the received weights. */
export class MeanAggregator extends Aggregator<WeightsContainer> {
  readonly #threshold: number;

  /**
   * @param threshold - how many contributions for trigger an aggregation step.
   *   - relative: 0 < t <= 1, thus requiring t * |nodes| contributions
   *   - absolute: t > 1, thus requiring t contributions
   */
  // TODO no way to require a single contribution
  constructor(model?: Model, roundCutoff = 0, threshold = 1) {
    if (threshold <= 0) throw new Error("threshold must be striclty positive");
    if (threshold > 1 && !Number.isInteger(threshold))
      throw new Error("absolute thresholds must be integeral");

    super(model, roundCutoff, 1);
    this.#threshold = threshold;
  }

  /** Checks whether the contributions buffer is full. */
  override isFull(): boolean {
    const actualThreshold =
      this.#threshold <= 1
        ? this.#threshold * this.nodes.size
        : this.#threshold;

    return (this.contributions.get(0)?.size ?? 0) >= actualThreshold;
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
