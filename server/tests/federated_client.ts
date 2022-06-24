import { expect } from 'chai'
import * as http from 'http'

import { client as clients, tasks, TrainingInformant, TrainingSchemes } from 'discojs'

import { getClient, startServer } from './utils'

const TASK = tasks.titanic.task

describe('federated client', function () { // the tests container
  this.timeout(30_000)

  let server: http.Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('connect to valid task', async () => {
    const client = await getClient(clients.Federated, server, TASK)
    await client.connect()
  })

  it('disconnect from valid task', async () => {
    const client = await getClient(clients.Federated, server, TASK)
    await client.connect()
    await client.disconnect()
  })

  it('Connect to non valid task', async () => {
    const client = await getClient(clients.Federated, server, { taskID: 'nonValidTask' })

    try {
      await client.connect()
    } catch {
      return
    }

    throw new Error("connect didn't fail")
  })

  it('checks that getRound returns a value greater or equal to zero', async () => {
    const client = await getClient(clients.Federated, server, TASK)
    await client.connect()

    const round = await client.getLatestServerRound()
    expect(round).to.be.greaterThanOrEqual(0) // Since the server you are running might have trained and round > 0

    await client.disconnect()
  })

  it('checks that getAsyncWeightInformantStatistics returns a JSON with the expected statistics', async () => {
    const client = await getClient(clients.Federated, server, TASK)
    await client.connect()

    const ti = new TrainingInformant(0, TASK.taskID, TrainingSchemes.FEDERATED)
    await client.pullServerStatistics(ti)

    expect(ti.currentRound).to.be.greaterThanOrEqual(0) // Since the server you are running might have trained and round > 0
    expect(ti.currentNumberOfParticipants).to.be.greaterThanOrEqual(0)
    expect(ti.totalNumberOfParticipants).to.be.greaterThanOrEqual(0)
    expect(ti.averageNumberOfParticipants).to.be.greaterThanOrEqual(0)

    await client.disconnect()
  })
})
