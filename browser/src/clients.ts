import { client, Client, Task } from '@epfml/discojs'

import { CONFIG } from './config'

export function getClient (task: Task): Client {
  return client.getClient(CONFIG.serverUrl, task)
}
