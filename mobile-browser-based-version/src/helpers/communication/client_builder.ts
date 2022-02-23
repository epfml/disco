import { DecentralisedClient } from './decentralised/client'
import { FederatedClient } from './federated/client'
import { FederatedAsyncClient } from './federated/client_async'

export function getClient (platform, task, password: string, federatedWithSyncScheme: boolean = false) {
  switch (platform) {
    case 'deai':
      return new DecentralisedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        password
      )
    case 'feai':
      return _getFederatedClient(task, federatedWithSyncScheme)
    default:
      throw new Error('Platform does not exist')
  }
}

function _getFederatedClient (task, federatedWithSyncScheme) {
  const client = federatedWithSyncScheme
    ? new FederatedClient(process.env.VUE_APP_FEAI_SERVER, task)
    : new FederatedAsyncClient(process.env.VUE_APP_FEAI_SERVER, task)
  return client
}
