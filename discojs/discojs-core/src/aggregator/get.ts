import { aggregator, Task } from '..'

export enum AggregatorChoice {
  MEAN,
  ROBUST,
  SECURE,
  BANDIT
}

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
