import { Map, List, Range } from "immutable";
import * as tf from "@tensorflow/tfjs";

import { AggregationStep, Aggregator } from "./aggregator.js";
import type { WeightsContainer, client } from "../index.js";
import { aggregation } from "../index.js";

/**
 * Aggregator implementing secure multi-party computation for decentralized learning.
 * An aggregation consists of two communication rounds:
 * - first, nodes communicate their secret shares to each other;
 * - then, they sum their received shares and communicate the result.
 * Finally, nodes are able to average the received partial sums to establish the aggregation result.
 */
export class SecureAggregator extends Aggregator {
  constructor(private readonly maxShareValue = 100) {
    super(0, 2);
  }

  override aggregate(): WeightsContainer {
    this.log(AggregationStep.AGGREGATE);

    switch (this.communicationRound) {
      // Sum the received shares
      case 0: {
        const currentContributions = this.contributions.get(0);
        if (currentContributions === undefined)
          throw new Error("aggregating without any contribution");

        return aggregation.sum(currentContributions.values());
      }
      // Average the received partial sums
      case 1: {
        const currentContributions = this.contributions.get(1);
        if (currentContributions === undefined)
          throw new Error("aggregating without any contribution");

        return aggregation.avg(currentContributions.values());
      }
      default:
        throw new Error("communication round is out of bounds");
    }
  }

  override add(
    nodeId: client.NodeID,
    contribution: WeightsContainer,
    communicationRound: number,
  ): Promise<WeightsContainer> {
    switch (communicationRound) {
      case 0:
      case 1:
        break;
      default:
        throw new Error("requires communication round to be 0 or 1");
    }

    this.log(
      this.contributions.hasIn([communicationRound, nodeId]) ?
        AggregationStep.UPDATE : AggregationStep.ADD,
      nodeId.slice(0, 4),
    );

    this.contributions = this.contributions.setIn(
      [communicationRound, nodeId],
      contribution,
    );
    return this.createAggregationPromise()
  }

  override isFull(): boolean {
    return (
      (this.contributions.get(this.communicationRound)?.size ?? 0) ===
      this.nodes.size
    );
  }

  override makePayloads(
    weights: WeightsContainer,
  ): Map<client.NodeID, WeightsContainer> {
    switch (this.communicationRound) {
      case 0: {
        const shares = this.generateAllShares(weights);
        // Arbitrarily assign our shares to the available nodes
        return Map(
          List(this.nodes).zip(shares) as List<[string, WeightsContainer]>,
        );
      }
      // Send our partial sum to every other nodes
      case 1:
        return this.nodes.toMap().map(() => weights);
      default:
        throw new Error("communication round is out of bounds");
    }
  }

  /** Generate N additive shares that aggregate to the secret weights array, where N is the number of peers. */
  public generateAllShares(secret: WeightsContainer): List<WeightsContainer> {
    if (this.nodes.size === 0)
      throw new Error("too few participants to generate shares");

    // Generate N-1 shares
    const shares = Range(0, this.nodes.size - 1)
      .map(() => this.generateRandomShare(secret))
      .toList();

    // The last share completes the sum
    return shares.push(secret.sub(aggregation.sum(shares)));
  }

  /**
   * Generates one share in the same shape as the secret that is populated with values randomly chosen from
   * a uniform distribution between (-maxShareValue, maxShareValue).
   */
  public generateRandomShare(secret: WeightsContainer): WeightsContainer {
    const MAX_SEED_BITS = 47;

    const random = crypto.getRandomValues(new BigInt64Array(1))[0];
    const seed = Number(BigInt.asUintN(MAX_SEED_BITS, random));

    return secret.map((t) =>
      tf.randomUniform(
        t.shape,
        -this.maxShareValue,
        this.maxShareValue,
        "float32",
        seed,
      ),
    );
  }
}
