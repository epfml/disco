import http, { Server } from 'node:http'

import { client, Task } from 'discojs'

import { getApp } from '../src/get_server'

export async function startServer (): Promise<Server> {
  const app = await getApp()

  const server = http.createServer(app).listen()

  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  return server
}

export async function getClient (server: Server, task: Task): Promise<client.Federated> {
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

  return new client.Federated(url, task)
}

export async function getDecClient (server: Server, task: Task): Promise<client.Decentralized> {
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
  const url = new URL(`ws://${host}`)

  return new client.Decentralized(url, task)
}
