import fs from 'node:fs/promises'
import path from 'node:path'
import type { Server } from 'node:http'
import { Range } from 'immutable'
import { assert } from 'chai'

import type { WeightsContainer } from '@epfml/discojs-core'
import {
  Disco, TrainingSchemes, client as clients,
  aggregator as aggregators, informant, defaultTasks
} from '@epfml/discojs-core'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'

import { startServer } from '../../src'

const SCHEME = TrainingSchemes.FEDERATED

describe('end-to-end federated', function () {
  this.timeout(120_000)

  let server: Server
  let url: URL
  beforeEach(async () => { [server, url] = await startServer() })
  afterEach(() => { server?.close() })

  async function cifar10user (): Promise<WeightsContainer> {
    const dir = '../example_training_data/CIFAR10/'
    const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
    const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

    const cifar10Task = defaultTasks.cifar10.getTask()

    const data = await new NodeImageLoader(cifar10Task).loadAll(files, { labels, shuffle: false })

    const aggregator = new aggregators.MeanAggregator(cifar10Task)
    const client = new clients.federated.FederatedClient(url, cifar10Task, aggregator)
    const disco = new Disco(cifar10Task, { scheme: SCHEME, client })

    await disco.fit(data)
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    return aggregator.model.weights
  }

  async function titanicUser (): Promise<WeightsContainer> {
    const files = ['../example_training_data/titanic_train.csv']

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

    const aggregator = new aggregators.MeanAggregator(titanicTask)
    const client = new clients.federated.FederatedClient(url, titanicTask, aggregator)
    const trainingInformant = new informant.FederatedInformant(titanicTask, 10)
    const disco = new Disco(titanicTask, { scheme: SCHEME, client, aggregator, informant: trainingInformant })

    await disco.fit(data)
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    assert(
      trainingInformant.trainingAccuracy() > 0.6,
      `expected training accuracy greater than 0.6 but got ${trainingInformant.trainingAccuracy()}`
    )
    assert(
      trainingInformant.validationAccuracy() > 0.6,
      `expected validation accuracy greater than 0.6 but got ${trainingInformant.validationAccuracy()}`
    )
    return aggregator.model.weights
  }

  it('two cifar10 users reach consensus', async () => {
    const [m1, m2] = await Promise.all([cifar10user(), cifar10user()])
    assert.isTrue(m1.equals(m2))
  })

  it('two titanic users reach consensus', async () => {
    const [m1, m2] = await Promise.all([titanicUser(), titanicUser()])
    assert.isTrue(m1.equals(m2))
  })
})
