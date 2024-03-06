import type { Task } from '../index.js'
import { aggregator } from '../index.js'

/**
 * Enumeration of the available types of aggregator.
 */
export enum AggregatorChoice {
  MEAN,
  SECURE,
  BANDIT
}

/**
 * Provides the aggregator object adequate to the given task.
 * @param task The task
 * @returns The aggregator
 */
export function getAggregator (task: Task): aggregator.Aggregator {
  const error = new Error('not implemented')
  switch (task.trainingInformation.network.aggregator) {
    case AggregatorChoice.MEAN:
      return new aggregator.MeanAggregator()
    case AggregatorChoice.BANDIT:
      throw error
    case AggregatorChoice.SECURE:
      // TODO enforce check via type
      if (task.trainingInformation.network.type !== 'decentralized') {
        throw new Error('secure aggregation is currently supported for decentralized only')
      }
      return new aggregator.SecureAggregator()
    default:
      return new aggregator.MeanAggregator()
  }
}
