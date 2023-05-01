import { expect } from 'chai'
import * as http from 'http'

import { client as clients, defaultTasks } from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'

const TASK = defaultTasks.titanic.getTask()

describe('federated client', function () {
  this.timeout(30_000)

  let server: http.Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('connect to valid task', async () => {
    const client = await getClient(clients.federated.Client, server, TASK)
    await client.connect()
  })

  it('disconnect from valid task', async () => {
    const client = await getClient(clients.federated.Client, server, TASK)
    await client.connect()
    await client.disconnect()
  })

  it('connect to non valid task', async () => {
    const client = await getClient(clients.federated.Client, server, { taskID: 'nonValidTask' } as any)

    try {
      await client.connect()
    } catch {
      return
    }

    throw new Error("connect didn't fail")
  })

  it('checks that getRound returns a value greater or equal to zero', async () => {
    const client = await getClient(clients.federated.Client, server, TASK)
    await client.connect()

    const round = await client.getLatestServerRound()
    expect(round).to.be.greaterThanOrEqual(0) // Since the server you are running might have trained and round > 0

    await client.disconnect()
  })

  /*
   * TODO: pullServerStatistics fails if #participants < BUFFER_CAPACITY.
   * This is due to the the server attempting to synchronize the clients,
   * which seems to be needed for byzantine-robust aggregation.
   */
  // it('checks that getAsyncWeightInformantStatistics returns a JSON with the expected statistics', async () => {
  //   const client = await getClient(clients.federated.Client, server, TASK)
  //   await client.connect()

  //   const ti = new informant.FederatedInformant(TASK, 0)
  //   await client.pullServerStatistics(ti)

  //   expect(ti.round()).to.be.greaterThanOrEqual(0)
  //   expect(ti.participants()).to.be.greaterThanOrEqual(1)
  //   expect(ti.totalParticipants()).to.be.greaterThanOrEqual(1)
  //   expect(ti.averageParticipants()).to.be.greaterThanOrEqual(1)

  //   await client.disconnect()
  // })
})
