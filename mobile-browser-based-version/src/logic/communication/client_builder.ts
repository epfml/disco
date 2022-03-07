import { DecentralisedClient } from './decentralised/decentralised_client'
import { FederatedClient } from './federated/federated_client'
import { Client } from './client'
import { Task } from '../task_definition/base/task'
import { Platform } from '../../platforms/platform'

export function getClient (platform: Platform, task: Task, password: string): Client {
  switch (platform) {
    case Platform.decentralized:
      return new DecentralisedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        password
      )
    case Platform.federated:
      return new FederatedClient(process.env.VUE_APP_FEAI_SERVER, task)
  }
}
