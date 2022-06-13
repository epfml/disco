import { client, Client, Task, TrainingSchemes } from 'discojs'

import { CONFIG } from './config'

export function getClient (trainingScheme: TrainingSchemes, task: Task): Client {
  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      return new client.Decentralized(CONFIG.serverUrl, task)
    case TrainingSchemes.FEDERATED:
      return new client.Federated(CONFIG.serverUrl, task)
    case TrainingSchemes.LOCAL:
      return new client.Local(CONFIG.serverUrl, task)
  }
}
