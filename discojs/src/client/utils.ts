import type { DataType, Task } from '../index.js'
import { client as clients, type aggregator } from '../index.js'

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 15_000

export async function timeout (ms = MAX_WAIT_PER_ROUND, errorMsg: string = 'timeout'): Promise<never> {
  return await new Promise((_, reject) => {
    setTimeout(() => { reject(new Error(errorMsg)) }, ms)
  })
}

export function getClient(
  trainingScheme: Task<DataType>["trainingInformation"]["scheme"],
  serverURL: URL,
  task: Task<DataType>,
  aggregator: aggregator.Aggregator,
): clients.Client {

  switch (trainingScheme) {
    case 'decentralized':
      return new clients.decentralized.DecentralizedClient(serverURL, task, aggregator)
    case 'federated':
      return new clients.federated.FederatedClient(serverURL, task, aggregator)
    case 'local':
      return new clients.LocalClient(serverURL, task, aggregator)
    default: {
      const _: never = trainingScheme
      throw new Error('should never happen')
    }
  }
}
