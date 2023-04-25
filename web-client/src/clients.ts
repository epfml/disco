import { client, Client, Task, TrainingSchemes } from '@epfml/discojs'

import { CONFIG } from './config'

export function getClient (trainingScheme: TrainingSchemes, task: Task): Client {
  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      if (task.trainingInformation.decentralizedSecure) {
        // TODO add sec agg here
        return new client.decentralized.Base(CONFIG.serverUrl, task)
      } else {
        return new client.decentralized.Base(CONFIG.serverUrl, task)
      }
    case TrainingSchemes.FEDERATED:
      return new client.federated.Client(CONFIG.serverUrl, task)
    case TrainingSchemes.LOCAL:
      return new client.Local(CONFIG.serverUrl, task)
  }
}
