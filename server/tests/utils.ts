import { Server } from 'node:http'

import { client, Task, TaskProvider } from '@epfml/discojs-node'

import { Disco } from '../src/get_server'

export async function startServer (tasks?: TaskProvider[]): Promise<Server> {
  const disco = new Disco()
  await disco.addDefaultTasks()

  if (tasks !== undefined) {
    for (const task of tasks) {
      await disco.addTask(task)
    }
  }

  const server = disco.serve()

  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  return server
}

export async function getClient<T extends client.Base> (
  Constructor: new (url: URL, t: Task) => T,
  server: Server,
  task: Task
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
  return new Constructor(url, task)
}
