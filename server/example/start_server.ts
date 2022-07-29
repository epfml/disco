import * as http from 'http'
import { getApp } from '../src/get_server'

/*  We start a server locally for this self-contained example; in practice the server
  *  would be run elsewhere.
  */
export async function startServer (): Promise<[http.Server, string]> {
  const app = await getApp()
  const server = http.createServer(app).listen()
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
    server.on('error', console.error)
  })
  const rawAddr = server.address()

  let addr: string
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

  return [server, addr]
}
