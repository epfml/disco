import { Client, Task } from 'discojs'

import { DecentralizedClient } from './decentralized_client'
import { FederatedClient } from './federated/federated_client'
import { Platform } from '../platforms/platform'

export function getClient (platform: Platform, task: Task, password?: string): Client {
  switch (platform) {
    case Platform.decentralized:
      return new DecentralizedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        password
      )
    case Platform.federated:
      if (password !== undefined) {
        throw new Error('unexpected password for federated client')
      }
      return new FederatedClient(process.env.VUE_APP_FEAI_SERVER, task)
  }
}
