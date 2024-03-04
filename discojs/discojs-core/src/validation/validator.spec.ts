import { assert } from 'chai'
import fs from 'fs'

import type { Task, data } from '../..'
import { Validator, ConsoleLogger, EmptyMemory, client as clients, aggregator, defaultTasks } from '../..'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'

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

describe('validator', () => {
  it('simple_face validator', async () => {
    const dir = '../../example_training_data/simple_face/'
    const files: string[][] = ['child/', 'adult/']
      .map((subdir: string) => fs.readdirSync(dir + subdir)
        .map((file: string) => dir + subdir + file))
    const labels = files.flatMap((files, index) => Array(files.length).fill(index))

    const data = (await new NodeImageLoader(simplefaceMock)
      .loadAll(files.flat(), { labels })).train
    const meanAggregator = new aggregator.MeanAggregator()
    const client = new clients.Local(new URL('http://localhost:8080'), simplefaceMock, meanAggregator)
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
    const files = ['../../example_training_data/titanic_train.csv']
    const data: data.Data = (await new NodeTabularLoader(titanicTask, ',').loadAll(files, {
      features: titanicTask.trainingInformation.inputColumns,
      labels: titanicTask.trainingInformation.outputColumns,
      shuffle: false
    })).train
    const meanAggregator = new aggregator.MeanAggregator()
    const client = new clients.Local(new URL('http://localhost:8080'), titanicTask, meanAggregator)
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
