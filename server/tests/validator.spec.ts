import { assert } from 'chai'
import fs from 'fs'
import type { Server } from 'node:http'

import type { Task, data } from '@epfml/discojs-core'
import { Validator, ConsoleLogger, EmptyMemory, client as clients, aggregator, defaultTasks } from '@epfml/discojs-core'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'
import { startServer } from '../src/index.js'

const simplefaceMock: Task = {
  id: 'simple_face',
  displayInformation: {},
  trainingInformation: {
    modelID: 'simple_face-model',
    epochs: 1,
    batchSize: 4,
    roundDuration: 1,
    validationSplit: 0,
    scheme: 'federated',
    dataType: 'image',
    IMAGE_H: 200,
    IMAGE_W: 200,
    LABEL_LIST: ['child', 'adult']
  }
}

describe('validator', function () {
  this.timeout(10_000)

  let server: Server
  let url: URL
  beforeEach(async () => { [server, url] = await startServer() })
  afterEach(() => { server?.close() })

  it('simple_face validator', async () => {
    const dir = '../datasets/simple_face/'
    const files: string[][] = ['child/', 'adult/']
      .map((subdir: string) => fs.readdirSync(dir + subdir)
        .map((file: string) => dir + subdir + file))
    const labels = files.flatMap((files, index) => Array<string>(files.length).fill(`${index}`))

    const data = (await new NodeImageLoader(simplefaceMock)
      .loadAll(files.flat(), { labels })).train
    const meanAggregator = new aggregator.MeanAggregator()
    const client = new clients.Local(url, simplefaceMock, meanAggregator)
    meanAggregator.setModel(await client.getLatestModel())
    const validator = new Validator(
      simplefaceMock,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client
    )
    await validator.assess(data)
    const size = data.size ?? -1
    if (size === -1) {
      console.log('data.size was undefined')
    }
    assert(
      validator.visitedSamples === data.size,
      `Expected ${size} visited samples but got ${validator.visitedSamples}`
    )
    assert(
      validator.accuracy > 0.3,
      `Expected random weight init accuracy greater than 0.3 but got ${validator.accuracy}`
    )
    console.table(validator.confusionMatrix)
  }).timeout(15_000)

  it('titanic validator', async () => {
    const titanicTask = defaultTasks.titanic.getTask()
    const files = ['../datasets/titanic_train.csv']
    const data: data.Data = (await new NodeTabularLoader(titanicTask, ',').loadAll(files, {
      features: titanicTask.trainingInformation.inputColumns,
      labels: titanicTask.trainingInformation.outputColumns,
      shuffle: false
    })).train
    const meanAggregator = new aggregator.MeanAggregator()
    const client = new clients.Local(url, titanicTask, meanAggregator)
    meanAggregator.setModel(await client.getLatestModel())
    const validator = new Validator(titanicTask, new ConsoleLogger(), new EmptyMemory(), undefined, client)
    await validator.assess(data)
    // data.size is undefined because tfjs handles dataset lazily
    // instead we count the dataset size manually
    let size = 0
    await data.dataset.forEachAsync(() => { size += 1 })
    assert(
      validator.visitedSamples === size,
      `Expected ${size} visited samples but got ${validator.visitedSamples}`
    )
    assert(
      validator.accuracy > 0.3,
      `Expected random weight init accuracy greater than 0.3 but got ${validator.accuracy}`
    )
  }).timeout(15_000)
})
