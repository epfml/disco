import type { Task } from '../index.js'
import { aggregator } from '../index.js'
import type { Model } from "../index.js";

type AggregatorOptions = {
  model?: Model,
  roundCutOff?: number, // MeanAggregator
  threshold?: number, // MeanAggregator
  thresholdType?: 'relative' | 'absolute', // MeanAggregator
}

/**
 * Initializes an aggregator according to the task definition, the training scheme and the specified options.
 * Here is the ordered list of parameters used to define the aggregator's default behavior:
 * task.trainingInformation.aggregator > scheme > task.trainingInformation.scheme
 * 
 * If `task.trainingInformation.aggregator` is defined, we initialize the chosen aggregator with `options`.
 * 
 * Otherwise, if `scheme` is defined, we initialize a MeanAggregator for both training schemes:
 * For federated learning or local training the aggregator waits for a single contribution to trigger a model update.
 * (the server's model update for federated learning or our own contribution if training locally)
 * For decentralized learning the aggregator waits for every nodes' contribution to trigger a model update.
 * 
 * If `scheme` is undefined, we rely on task.trainingInformation.scheme to infer `scheme`.
 * 
 * @param task The task object associated with the current training session
 * @param scheme The training scheme. If not specified, the task training information scheme is used
 * @param options Options passed down to the aggregator's constructor
 * @returns The aggregator
 */
export function getAggregator(task: Task, scheme?: Required<Task['trainingInformation']['scheme']>,
  options?: AggregatorOptions): aggregator.Aggregator {
  if (options === undefined) {
    options = {} // init empty arguments if not specified
  }

  if (scheme == undefined) {
    scheme = task.trainingInformation.scheme
  }

  switch (task.trainingInformation.aggregator) {
    case 'mean':
      return new aggregator.MeanAggregator(options.model, options.roundCutOff, options.threshold, options.thresholdType)
    case 'secure':
      if (scheme !== 'decentralized') {
        throw new Error('secure aggregation is currently supported for decentralized only')
      }
      return new aggregator.SecureAggregator(options.model, task.trainingInformation.maxShareValue)
    default:
      if (scheme === 'decentralized') {
        // By default we expect a contribution from all peers, so we set the threshold to 100%
        return new aggregator.MeanAggregator(undefined, undefined, 1, 'relative') 
      } else {
        // If scheme == 'federated' then we only expect the server's contribution at each round 
        // so we set the aggregation threshold to 1 contribution
        // If scheme == 'local' then we only expect our own contribution
        return new aggregator.MeanAggregator(undefined, undefined, 1, 'absolute') 
      }
  }
}
