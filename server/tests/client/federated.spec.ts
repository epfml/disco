import type * as http from 'http'

import { aggregator as aggregators, client as clients, informant, defaultTasks } from '@epfml/discojs-core'

import { startServer } from '../../src'

const TASK = defaultTasks.titanic.getTask()

describe('federated client', function () {
  this.timeout(60_000)

  let server: http.Server
  let url: URL
  beforeEach(async () => { [server, url] = await startServer() })
  afterEach(() => { server?.close() })

  it('connect to & disconnect from valid task', async () => {
    const client = new clients.federated.FederatedClient(url, TASK, new aggregators.MeanAggregator())
    await client.connect()
    await client.disconnect()
  })

  it('connect to non valid task', async () => {
    const client = new clients.federated.FederatedClient(
      url,
      {
        id: 'nonValidTask',
        displayInformation: {},
        trainingInformation: {
          modelID: 'irrelevant',
          epochs: 1,
          roundDuration: 1,
          validationSplit: 0,
          batchSize: 1,
          scheme: 'federated',
          dataType: 'tabular'
        }
      },
      new aggregators.MeanAggregator()
    )

    try {
      await client.connect()
    } catch {
      return
    }

    throw new Error("connect didn't fail")
  })

  it('checks that getAsyncWeightInformantStatistics returns a JSON with the expected statistics', async () => {
    const client = new clients.federated.FederatedClient(url, TASK, new aggregators.MeanAggregator())
    await client.connect()

    const ti = new informant.FederatedInformant(TASK, 0)
    await client.receiveStatistics(ti)

    await client.disconnect()

    // TODO commented code
    //   expect(ti.round()).to.be.greaterThanOrEqual(0)
    //   expect(ti.participants()).to.be.greaterThanOrEqual(1)
    //   expect(ti.totalParticipants()).to.be.greaterThanOrEqual(1)
    //   expect(ti.averageParticipants()).to.be.greaterThanOrEqual(1)

    //   await client.disconnect()
    // })
  })
})
