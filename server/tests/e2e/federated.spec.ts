import fs from 'node:fs/promises'
import path from 'node:path'
import type { Server } from 'node:http'
import { Range } from 'immutable'
import { assert, expect } from 'chai'

import type { WeightsContainer } from '@epfml/discojs-core'
import {
  Disco, client as clients, data,
  aggregator as aggregators, defaultTasks
} from '@epfml/discojs-core'
import { NodeImageLoader, NodeTabularLoader, NodeTextLoader } from '@epfml/discojs-node'

import { startServer } from '../../src/index.js'

describe('end-to-end federated', function () {
  this.timeout(100_000)

  let server: Server
  let url: URL
  beforeEach(async () => { [server, url] = await startServer() })
  afterEach(() => { server?.close() })

  async function cifar10user (): Promise<WeightsContainer> {
    const dir = '../datasets/CIFAR10/'
    const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
    const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

    const cifar10Task = defaultTasks.cifar10.getTask()

    const data = await new NodeImageLoader(cifar10Task).loadAll(files, { labels, shuffle: false })

    const aggregator = new aggregators.MeanAggregator()
    const client = new clients.federated.FederatedClient(url, cifar10Task, aggregator)
    const disco = new Disco(cifar10Task, { scheme: 'federated', client })

    await disco.fitted(data)
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    return aggregator.model.weights
  }

  async function titanicUser (): Promise<WeightsContainer> {
    const files = ['../datasets/titanic_train.csv']

    const titanicTask = defaultTasks.titanic.getTask()
    titanicTask.trainingInformation.epochs = 5
    const data = await (new NodeTabularLoader(titanicTask, ',').loadAll(
      files,
      {
        features: titanicTask.trainingInformation.inputColumns,
        labels: titanicTask.trainingInformation.outputColumns,
        shuffle: false
      }
    ))

    const aggregator = new aggregators.MeanAggregator()
    const client = new clients.federated.FederatedClient(url, titanicTask, aggregator)
    const disco = new Disco(titanicTask, { scheme: 'federated', client, aggregator })

    const logs = await disco.fitted(data)
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    expect(logs.last()?.epoches.last()?.training.accuracy).to.be.greaterThan(0.6)
    expect(logs.last()?.epoches.last()?.validation.accuracy).to.be.greaterThan(0.6)
    return aggregator.model.weights
  }

  async function wikitextUser (): Promise<void> {
    const task = defaultTasks.wikitext.getTask()
    const loader = new NodeTextLoader(task)
    const dataSplit: data.DataSplit = {
      train: await data.TextData.init((await loader.load('../datasets/wikitext/wiki.train.tokens')), task),
      validation: await data.TextData.init(await loader.load('../datasets/wikitext/wiki.valid.tokens'), task)
    }

    const aggregator = new aggregators.MeanAggregator()
    const client = new clients.federated.FederatedClient(url, task, aggregator)
    const disco = new Disco(task, { scheme: 'federated', client, aggregator })

    const logs = await disco.fitted(dataSplit)
    await disco.close()

    expect(logs.first()?.epoches.first()?.loss).to.be.above(
      logs.last()?.epoches.last()?.loss as number,
    );
  }

  it('two cifar10 users reach consensus', async () => {
    this.timeout(90_000)

    const [m1, m2] = await Promise.all([cifar10user(), cifar10user()])
    assert.isTrue(m1.equals(m2))
  })

  it('two titanic users reach consensus', async () => {
    this.timeout(30_000)

    const [m1, m2] = await Promise.all([titanicUser(), titanicUser()])
    assert.isTrue(m1.equals(m2))
  })

  it('trains wikitext', async () => {
    this.timeout(120_000)

    await wikitextUser()
  })
})
