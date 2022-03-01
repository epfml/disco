import { DecentralisedClient } from './decentralised/decentralised_client'
import { FederatedClient } from './federated/federated_client'

export function getClient (platform, task, password: string) {
  switch (platform) {
    case 'deai':
      return new DecentralisedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        password
      )
    case 'feai':
      return new FederatedClient(process.env.VUE_APP_FEAI_SERVER, task)
    default:
      throw new Error('Platform does not exist')
  }
}
