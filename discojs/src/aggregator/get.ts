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
 * The aggregator type specified in the task's training information has the first priority. 
 * If no aggregator is specified in the task then we fallback on the training scheme.
 * Decentralized learning defaults to a mean aggregator that waits for contributions from every single peers
 * Federated and local training default to a mean aggregator that waits for a single contribution 
 * (the server for federated or ourselves if training locally)
 * 
 * @param task The task object associated with the current training session
 * @param scheme The training scheme
 * @param options Options passed down to the aggregator's constructor
 * @returns The aggregator
 */
export function getAggregator(task: Task, scheme: Required<Task['trainingInformation']['scheme']>,
  options?: AggregatorOptions): aggregator.Aggregator {
  if (options === undefined) {
    options = {} // init empty arguments if not specified
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
