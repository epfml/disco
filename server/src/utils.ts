import type { Server } from 'node:http'

import type { aggregator, client, Task } from '@epfml/discojs-core'

import { runDefaultServer } from './get_server'

export async function startServer (): Promise<Server> {
  const server = await runDefaultServer()

  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  return server
}

export async function getClient<T extends client.Client> (
  Constructor: new (url: URL, t: Task, agg: aggregator.Aggregator) => T,
  server: Server,
  task: Task,
  aggregator: aggregator.Aggregator
): Promise<T> {
  let host: string
  const addr = server?.address()
  if (addr === undefined || addr === null) {
    throw new Error('server not started')
  } else if (typeof addr === 'string') {
    host = addr
  } else {
    if (addr.family === '4') {
      host = `${addr.address}:${addr.port}`
    } else {
      let address = `[${addr.address}]`
      // axios fails on IPv6 addresses, replacing most probable axios#5333
      if (address === '[::]') {
        address = 'localhost'
      }
      host = `${address}:${addr.port}`
    }
  }
  const url = new URL(`http://${host}`)
  return new Constructor(url, task, aggregator)
}
