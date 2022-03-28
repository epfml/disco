import { Client } from './client'
import { DecentralizedClient } from './decentralized/decentralized_client'
import { FederatedClient } from './federated/federated_client'
import { Platform } from '../../platforms/platform'
import { Task } from '../task/task'

export function getClient (platform: Platform, task: Task, password: string): Client {
  switch (platform) {
    case Platform.decentralized:
      return new DecentralizedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        password
      )
    case Platform.federated:
      return new FederatedClient(process.env.VUE_APP_FEAI_SERVER, task)
  }
}
