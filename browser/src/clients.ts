import { client, Client, Task } from '@epfml/discojs'

import { CONFIG } from './config'

export function getClient (task: Task, forceLocalClient: boolean = false): Client {
  if (forceLocalClient) {
    return new client.Local(CONFIG.serverUrl, task.taskID)
  }
  return client.getClient(CONFIG.serverUrl, task)
}

// TODO move to trainer and add the same for the informer
