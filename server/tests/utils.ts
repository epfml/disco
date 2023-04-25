import { Server } from 'node:http'

import { aggregator, client, Task } from '@epfml/discojs-node'

import { runDefaultServer } from '../src/get_server'

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
      host = `[${addr.address}]:${addr.port}`
    }
  }
  const url = new URL(`http://${host}`)
  return new Constructor(url, task, aggregator)
}
