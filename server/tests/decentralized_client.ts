import { assert, expect } from 'chai'
import * as http from 'http'
import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { client as clients, informant, tasks } from 'discojs'

import { getClient, startServer } from './utils'

const TASK = tasks.titanic.task

describe('decentralized client', function () { // the tests container
  this.timeout(30_000)

  let server: http.Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('connect and disconnect from valid task', async () => {
    const client = await getClient(clients.Decentralized, server, TASK)

    await client.connect()
    await client.disconnect()
  })

  it('connects to other nodes', async () => {
    const users = List(await Promise.all([
      getClient(clients.Decentralized, server, TASK),
      getClient(clients.Decentralized, server, TASK),
      getClient(clients.Decentralized, server, TASK)
    ]))

    try {
      await Promise.all(users.map(async (u) => await u.connect()))

      const wss = List.of(
        [tf.tensor(0)],
        [tf.tensor(1)],
        [tf.tensor(2)]
      )

      const tis = users.map(() => new informant.DecentralizedInformant(TASK.taskID, 0))

      // wait for others to connect
      await new Promise((resolve) => setTimeout(resolve, 1_000))

      await Promise.all(
        users.zip(wss).zip(tis)
          .map(async ([[u, ws], ti]) => await u.onRoundEndCommunication(ws, ws, 0, ti))
          .toArray()
      )

      tis.forEach((ti) => expect(ti.participants()).to.eq(users.size - 1))
    } finally {
      await Promise.all(users.map(async (u) => await u.disconnect()))
    }
  })
})
