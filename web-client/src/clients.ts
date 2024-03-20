import { client as clients, aggregator as aggregators, Task } from '@epfml/discojs-core'

import { CONFIG } from './config'

export function getClient (trainingScheme: Required<Task['trainingInformation']['scheme']>, task: Task): clients.Client {
  const aggregator = aggregators.getAggregator(task)

  switch (trainingScheme) {
    case 'decentralized':
      return new clients.decentralized.DecentralizedClient(CONFIG.serverUrl, task, aggregator)
    case 'federated':
      return new clients.federated.FederatedClient(CONFIG.serverUrl, task, aggregator)
    case 'local':
      return new clients.Local(CONFIG.serverUrl, task, aggregator)
  }
}
