import { expect } from 'chai'
import * as http from 'http'

import { tasks, TrainingInformant, TrainingSchemes } from 'discojs'

<<<<<<< HEAD
import { getClient, getDecClient, startServer } from './utils'
=======
import { getClient, getClientDec, startServer } from './utils'
>>>>>>> 7e530a226d7488ad4fe22b327b6983b633158f86

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