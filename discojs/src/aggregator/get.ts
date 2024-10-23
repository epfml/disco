import type { DataType, Task } from '../index.js'
import { aggregator } from '../index.js'

type AggregatorOptions = Partial<{
  scheme: Task<DataType>["trainingInformation"]["scheme"]; // if undefined, fallback on task.trainingInformation.scheme
  roundCutOff: number, // MeanAggregator
  threshold: number, // MeanAggregator
  thresholdType: 'relative' | 'absolute', // MeanAggregator
}>

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
 * @param task The task object associated with the current training session
 * @param options Options passed down to the aggregator's constructor
 * @returns The aggregator
 */
export function getAggregator(
  task: Task<DataType>,
  options: AggregatorOptions = {},
): aggregator.Aggregator {
  const aggregationStrategy = task.trainingInformation.aggregationStrategy ?? 'mean'
  const scheme = options.scheme ?? task.trainingInformation.scheme
  
  switch (aggregationStrategy) {
    case 'mean':
      if (scheme === 'decentralized') {
        // If options are not specified, we default to expecting a contribution from all peers, so we set the threshold to 100%
        options = {
          roundCutOff: undefined, threshold: 1, thresholdType: 'relative',
          ...options
        }
      } else {
        // If scheme == 'federated' then we only expect the server's contribution at each round 
        // so we set the aggregation threshold to 1 contribution
        // If scheme == 'local' then we only expect our own contribution
        options = {
          roundCutOff: undefined, threshold: 1, thresholdType: 'absolute',
          ...options
        }
      }
      return new aggregator.MeanAggregator(options.roundCutOff, options.threshold, options.thresholdType)
    case 'secure':
      if (scheme !== 'decentralized') {
        throw new Error('secure aggregation is currently supported for decentralized only')
      }
      return new aggregator.SecureAggregator(task.trainingInformation.maxShareValue)
  }
}
