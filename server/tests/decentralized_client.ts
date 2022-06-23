// import { expect } from 'chai'
import * as http from 'http'

import { tasks } from 'discojs'

import { getDecClient, startServer } from './utils'

const TASK = tasks.titanic.task

describe('decentralized client', function () { // the tests container
  this.timeout(30_000)

  let server: http.Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('connect to valid task', async () => {
    const client = await getDecClient(server, TASK)
    await client.connect()
  })

  it('disconnect from valid task', async () => {
    const client = await getDecClient(server, TASK)
    await client.connect()
    await client.disconnect()
  })

  it('Connect to non valid task', async () => {
    const client = await getDecClient(server, { taskID: 'nonValidTask' })

    try {
      await client.connect()
    } catch {
      return
    }

    throw new Error("connect didn't fail")
  })
})
