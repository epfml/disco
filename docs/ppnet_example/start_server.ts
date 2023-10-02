import http from 'node:http'

import { Disco } from '@epfml/disco-server'

export async function startServer (): Promise<[http.Server, URL]> {
  const disco = new Disco()
  await disco.addDefaultTasks()

  const server = disco.serve(8000)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
    server.on('error', console.error)
  })

  let addr: string
  const rawAddr = server.address()
  if (rawAddr === null) {
    throw new Error('unable to get server address')
  } else if (typeof rawAddr === 'string') {
    addr = rawAddr
  } else if (typeof rawAddr === 'object') {
    if (rawAddr.family === '4') {
      addr = `${rawAddr.address}:${rawAddr.port}`
    } else {
      addr = `[${rawAddr.address}]:${rawAddr.port}`
    }
  } else {
    throw new Error('unable to get address to server')
  }

  return [server, new URL('', `http://${addr}`)]
}