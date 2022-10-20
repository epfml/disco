import { client, Client, Task, TrainingSchemes } from '@epfml/discojs'

import { CONFIG } from './config'

export function getClient (trainingScheme: TrainingSchemes, task: Task): Client {
  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      if (task.trainingInformation.decentralizedSecure) {
        return new client.decentralized.SecAgg(CONFIG.serverUrl, task)
      } else {
        return new client.decentralized.ClearText(CONFIG.serverUrl, task)
      }
    case TrainingSchemes.FEDERATED:
      return new client.federated.Client(CONFIG.serverUrl, task)
    case TrainingSchemes.LOCAL:
      return new client.Local(CONFIG.serverUrl, task)
  }
}
