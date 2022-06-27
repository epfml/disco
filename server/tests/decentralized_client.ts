import * as http from 'http'

import { client as clients, tasks } from 'discojs'

import { getClient, startServer } from './utils'

const TASK = tasks.titanic.task

describe('decentralized client', function () { // the tests container
  this.timeout(30_000)

  let server: http.Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('connect to valid task', async () => {
    const client = await getClient(clients.Decentralized, server, TASK)
    await client.connect()
  })

  it('disconnect from valid task', async () => {
    const client = await getClient(clients.Decentralized, server, TASK)
    await client.connect()
    await client.disconnect()
  })
})
