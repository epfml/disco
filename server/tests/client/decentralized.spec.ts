import type * as http from 'http'

import type { Task } from '@epfml/discojs'
import { aggregator as aggregators, client as clients, defaultTasks } from '@epfml/discojs'
import { expect } from 'chai'
import { startServer } from '../../src/index.js'
import { WeightsContainer } from '@epfml/discojs/dist/index.js'
import { List } from 'immutable'

const TASK = defaultTasks.mnist.getTask()

function test(
  name: string,
  Client: new (url: URL, task: Task, aggregator: aggregators.Aggregator) => clients.Client,
  Aggregator: new () => aggregators.Aggregator
): void {
  describe(`decentralized ${name} client`, function () {
    this.timeout(30_000)

    let server: http.Server
    let url: URL
    beforeEach(async () => { [server, url] = await startServer() })
    afterEach(() => { server?.close() })

    it('connect and disconnect from valid task', async () => {
      const aggregator = new Aggregator()
      const client = new Client(url, TASK, aggregator)

      await client.connect()
      await client.disconnect()
    })

    it('connect to other nodes', async () => {

      const clients = List(await Promise.all([
        new Client(url, TASK, new Aggregator()),
        new Client(url, TASK, new Aggregator()),
        new Client(url, TASK, new Aggregator())
      ]))

      try {
        await Promise.all(clients.map(async (c) => await c.connect()))

        const wss = List.of(
          WeightsContainer.of([0]),
          WeightsContainer.of([1]),
          WeightsContainer.of([2])
        )


        await new Promise((resolve) => setTimeout(resolve, 1_000))

        await Promise.all(
          clients.zip(wss)
            .map(async ([c, ws]) => await c.onRoundBeginCommunication(ws as WeightsContainer, 0))
            .toArray()
        )

        // send contribution to peers that are waiting: is done via onRoundEndCommunication:
        // 
        

        clients.forEach((client) => expect(clients.size, 'all nodes should be connected to each other').to.eq(client.nodes.size))

        await Promise.all(
          clients.zip(wss)
            .map(async ([c, ws]) => await c.onRoundEndCommunication(ws as WeightsContainer, 0))
            .toArray()
        )

        clients.forEach((client) => expect(0, 'all nodes should be disconnected at the end of a round').to.eq(client.nodes.size))

      } finally {
        await Promise.all(clients.map(async (c) => await c.disconnect()))
      }

    })

  })
}

test('cleartext', clients.decentralized.DecentralizedClient, aggregators.MeanAggregator)
test('secure', clients.decentralized.DecentralizedClient, aggregators.SecureAggregator)
