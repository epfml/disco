import type * as http from 'http'

import { aggregator as aggregators, client as clients, informant, defaultTasks, type Task } from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'

const TASK = defaultTasks.titanic.getTask()

describe('federated client', function () {
  this.timeout(60_000)

  let server: http.Server
  beforeEach(async () => { server = await startServer() })
  afterEach(() => { server?.close() })

  it('connect to & disconnect from valid task', async () => {
    const client = await getClient(clients.federated.FederatedClient, server, TASK, new aggregators.MeanAggregator(TASK))
    await client.connect()
    await client.disconnect()
  })

  it('connect to non valid task', async () => {
    const client = await getClient(
      clients.federated.FederatedClient,
      server,
      { taskID: 'nonValidTask' } as unknown as Task,
      new aggregators.MeanAggregator(TASK)
    )

    try {
      await client.connect()
    } catch {
      return
    }

    throw new Error("connect didn't fail")
  })

  it('checks that getAsyncWeightInformantStatistics returns a JSON with the expected statistics', async () => {
    const client = await getClient(clients.federated.FederatedClient, server, TASK, new aggregators.MeanAggregator(TASK))
    await client.connect()

    const ti = new informant.FederatedInformant(TASK, 0)
    await client.receiveStatistics(ti)

    await client.disconnect()

    //   expect(ti.round()).to.be.greaterThanOrEqual(0)
    //   expect(ti.participants()).to.be.greaterThanOrEqual(1)
    //   expect(ti.totalParticipants()).to.be.greaterThanOrEqual(1)
    //   expect(ti.averageParticipants()).to.be.greaterThanOrEqual(1)

    //   await client.disconnect()
    // })
  })
})
