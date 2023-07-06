import { aggregator, Task } from '..'

/**
 * Enumeration of the available types of aggregator.
 */
export enum AggregatorChoice {
  MEAN,
  ROBUST,
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
  switch (task.trainingInformation.aggregator) {
    case AggregatorChoice.MEAN:
      return new aggregator.MeanAggregator(task)
    case AggregatorChoice.ROBUST:
      throw error
    case AggregatorChoice.BANDIT:
      throw error
    case AggregatorChoice.SECURE:
      if (task.trainingInformation.scheme !== 'decentralized') {
        throw new Error('secure aggregation is currently supported for decentralized only')
      }
      return new aggregator.SecureAggregator(task)
    default:
      return new aggregator.MeanAggregator(task)
  }
}
