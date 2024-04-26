import type { Server } from 'node:http'

import { runDefaultServer } from './get_server.js'

export async function startServer (): Promise<[Server, URL]> {
  const server = await runDefaultServer()
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  let host: string
  const addr = server.address()
  if (addr === null) {
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

  return [server, url]
}
