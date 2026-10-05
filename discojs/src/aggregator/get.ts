import type { DataType, Network } from "#types/index";
import type { Task } from "#task/index";
import type { Aggregator } from "#aggregator/aggregator";
import type { MultiRoundAggregator } from "#aggregator/multiround";
import { MeanAggregator } from "#aggregator/mean";
import { SecureAggregator } from "#aggregator/secure";
import { ByzantineRobustAggregator } from "#aggregator/byzantine";

type MultiRoundOptions = {
  roundCutOff: number;
  threshold: number;
  thresholdType: "relative" | "absolute";
};

type AggregatorOptions = Partial<
  {
    scheme: Task<DataType, Network>["trainingInformation"]["scheme"]; // if undefined, fallback on task.trainingInformation.scheme
  } & MultiRoundOptions
>;

/**
 * Initializes an aggregator according to the task definition, the training scheme and the aggregator parameters.
 * Here is the ordered list of parameters used to define the aggregator and its default behavior:
 * task.trainingInformation.aggregationStrategy > options.scheme > task.trainingInformation.scheme
 *
 * If `task.trainingInformation.aggregationStrategy` is defined, we initialize the chosen aggregator with `options` parameter values.
 * Otherwise, we default to a MeanAggregator for both training schemes.
 *
 * For the MeanAggregator we rely on `options.scheme` and fallback on `task.trainingInformation.scheme` to infer default values.
 * Unless specified otherwise, for federated learning or local training the aggregator default to waiting
 * for a single contribution to trigger a model update.
 * (the server's model update for federated learning or our own contribution if training locally)
 * For decentralized learning the aggregator defaults to waiting for every nodes' contribution to trigger a model update.
 *
 * To create the aggregator of a federated server, use `getFederatedServerAggregator` instead.
 *
 * @param task The task object associated with the current training session
 * @param options Options passed down to the aggregator's constructor
 * @returns The aggregator
 */
export function getAggregator(
  task: Task<DataType, Network>,
  options: AggregatorOptions = {},
): Aggregator {
  const scheme = options.scheme ?? task.trainingInformation.scheme;

  if (task.trainingInformation.aggregationStrategy === "secure") {
    if (scheme !== "decentralized") {
      throw new Error(
        "secure aggregation is currently supported for decentralized only",
      );
    }
    return new SecureAggregator(task.trainingInformation.maxShareValue);
  }

  // If options are not specified, we default to expecting a contribution from all peers, so we set the threshold to 100%

  // If scheme == 'federated' then we only expect the server's contribution at each round
  // so we set the aggregation threshold to 1 contribution
  // If scheme == 'local' then we only expect our own contribution

  return getMultiRoundAggregator(task, {
    roundCutOff: 0,
    threshold: 1,
    thresholdType: scheme === "decentralized" ? "relative" : "absolute",
    ...options, // user overrides defaults
  });
}

/**
 * Initializes the aggregator of a federated server according to the task definition.
 *
 * Unless specified otherwise, the server only accepts contributions from the current round
 * and waits for every connected client's contribution to trigger a model update.
 * (`task.trainingInformation.minNbOfParticipants` is enforced separately by the server)
 *
 * @param task The federated task hosted by the server
 * @param options Options passed down to the aggregator's constructor
 * @returns The aggregator
 */
export function getFederatedServerAggregator(
  task: Task<DataType, "federated">,
  options: Partial<MultiRoundOptions> = {},
): MultiRoundAggregator {
  return getMultiRoundAggregator(task, {
    roundCutOff: 0,
    threshold: 1,
    thresholdType: "relative",
    ...options, // user overrides defaults
  });
}

function getMultiRoundAggregator(
  task: Task<DataType, Network>,
  options: MultiRoundOptions,
): MultiRoundAggregator {
  const { roundCutOff, threshold, thresholdType } = options;

  switch (task.trainingInformation.aggregationStrategy) {
    case "byzantine": {
      const {
        clippingRadius = 1.0,
        maxIterations = 1,
        beta = 0.9,
      } = task.trainingInformation.privacy.byzantineFaultTolerance;

      return new ByzantineRobustAggregator(
        roundCutOff,
        threshold,
        thresholdType,
        clippingRadius,
        maxIterations,
        beta,
      );
    }
    case "mean":
      return new MeanAggregator(roundCutOff, threshold, thresholdType);
    case "secure":
      throw new Error("secure aggregation is not a multi-round aggregator");
  }
}
