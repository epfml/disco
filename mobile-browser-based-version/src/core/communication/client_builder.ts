import { Client } from './client'
import { DecentralizedClient } from './decentralized_client'
import { FederatedClient } from './federated/federated_client'
import { TrainingSchemes } from '../training/trainingSchemes'
import { Task } from '../task/base/task'

export function getClient (trainingScheme: TrainingSchemes, task: Task, password?: string): Client {
  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      return new DecentralizedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        password
      )
    case TrainingSchemes.FEDERATED:
      if (password !== undefined) {
        throw new Error('unexpected password for federated client')
      }
      return new FederatedClient(process.env.VUE_APP_FEAI_SERVER, task)
  }
}
