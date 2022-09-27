import net from 'node:net'
import { AddressInfo } from 'node:net'

import fs from 'fs'

import { client, Task, TrainerLog } from '@epfml/discojs'

// port to start server on
const PORT: number = 8080

async function isServerAvailable(
  host: string,
  timeout: number = 1000,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket()

    const onError = () => {
      socket.destroy()
      reject()
    }

    socket.setTimeout(timeout)
    socket.once('error', onError)
    socket.once('timeout', onError)

    socket.connect(PORT, host, () => {
      socket.end()
      resolve()
    })
  })
}

async function getServerAddress(
  host: string = '127.0.0.1',
): Promise<AddressInfo> {
  return new Promise<AddressInfo>((resolve, reject) => {
    isServerAvailable(host)
      .then(() => {
        resolve({ port: PORT, address: '127.0.0.1', family: 'IPv4' })
      })
      .catch(() => {
        throw new Error('Server not started')
      })
  })
}

export async function getClient<T extends client.Base>(
  Constructor: new (url: URL, t: Task) => T,
  task: Task,
): Promise<T> {
  const addr: AddressInfo = await getServerAddress()
  const host: string = `${addr.address}:${addr.port}`

  const url = new URL(`http://${host}`)
  return new Constructor(url, task)
}

export function saveLog(logs: TrainerLog[], fileName: string): void {
  const filePath = `./${fileName}`
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2))
}
