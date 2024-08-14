import type { Logger, Task } from '../index.js'
import { client as clients, type aggregator } from '../index.js'

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 15_000

export async function timeout (ms = MAX_WAIT_PER_ROUND, errorMsg: string = 'timeout'): Promise<never> {
  return await new Promise((_, reject) => {
    setTimeout(() => { reject(new Error(errorMsg)) }, ms)
  })
}

export function getClient(trainingScheme: Required<Task['trainingInformation']['scheme']>,
  serverURL: URL, task: Task, aggregator: aggregator.Aggregator, logger: Logger): clients.Client {

  switch (trainingScheme) {
    case 'decentralized':
      return new clients.decentralized.DecentralizedClient(serverURL, task, aggregator, logger)
    case 'federated':
      return new clients.federated.FederatedClient(serverURL, task, aggregator, logger)
    case 'local':
      return new clients.Local(serverURL, task, aggregator, logger)
    default: {
      const _: never = trainingScheme
      throw new Error('should never happen')
    }
  }
}
