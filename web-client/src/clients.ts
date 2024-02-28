import { client as clients, aggregator as aggregators, Task, TrainingSchemes } from '@epfml/discojs-core'

import { CONFIG } from './config'

export function getClient (trainingScheme: TrainingSchemes, task: Task): clients.Client {
  const aggregator = aggregators.getAggregator(task)

  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      return new clients.decentralized.DecentralizedClient(CONFIG.serverUrl, task, aggregator)
    case TrainingSchemes.FEDERATED:
      return new clients.federated.FederatedClient(CONFIG.serverUrl, task, aggregator)
    case TrainingSchemes.LOCAL:
      return new clients.Local(CONFIG.serverUrl, task, aggregator)
    default:
      throw new Error('unknown training scheme')
  }
}
