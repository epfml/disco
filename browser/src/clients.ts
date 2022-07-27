import { client, Client, Task, TrainingSchemes } from 'discojs'
// import {SecureDecentralized} from 'discojs/src/client/secureDecentralizedClient'

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
      return new client.Federated(CONFIG.serverUrl, task)
    case TrainingSchemes.LOCAL:
      return new client.Local(CONFIG.serverUrl, task)
  }
}
