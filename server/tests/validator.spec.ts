import { assert } from 'chai'
import fs from 'fs'
import type { Server } from 'node:http'

import {
  Validator, ConsoleLogger, EmptyMemory, client as clients,
  aggregator, defaultTasks, data
} from '@epfml/discojs'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'
import { startServer } from '../src/index.js'

describe('validator', function () {
  this.timeout(10_000)

  let server: Server
  let url: URL
  beforeEach(async () => { [server, url] = await startServer() })
  afterEach(() => { server?.close() })

  it('can read and predict randomly on simple_face', async () => {
    // Load the data
    const dir = '../datasets/simple_face/'
    const files: string[][] = ['child/', 'adult/'].map((subdir: string) => {
      return fs.readdirSync(dir + subdir)
        .map((file: string) => dir + subdir + file)
        .filter((path: string) => path.endsWith('.png'))
    })
    
    const childLabels = files[0].map(_ => 'child')
    const adultLabels = files[1].map(_ => 'adult')
    const labels = childLabels.concat(adultLabels)

    const simplefaceTask = defaultTasks.simpleFace.getTask()

    const data = (await new NodeImageLoader(simplefaceTask)
      .loadAll(files.flat(), { labels, channels: undefined })).train
    
    // Init a validator instance
    const meanAggregator = new aggregator.MeanAggregator()
    const client = new clients.Local(url, simplefaceTask, meanAggregator)
    meanAggregator.setModel(await client.getLatestModel())
    const validator = new Validator(
      simplefaceTask,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client
    )

    // Read data and predict with an untrained model
    for await (const _ of validator.test(data));
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
  }).timeout(5_000)

  it('can read and predict randomly on titanic', async () => {
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
    for await (const _ of validator.test(data));
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
  }).timeout(1000)

  it('can read and predict randomly on lus_covid', async () => {
    // Load the data
    const dir = '../datasets/lus_covid/'
    const files: string[][] = ['COVID+/', 'COVID-/'].map((subdir: string) => {
      return fs.readdirSync(dir + subdir)
        .map((file: string) => dir + subdir + file)
        .filter((path: string) => path.endsWith('.png'))
    })
    
    const positiveLabels = files[0].map(_ => 'COVID-Positive')
    const negativeLabels = files[1].map(_ => 'COVID-Negative')
    const labels = positiveLabels.concat(negativeLabels)

    const lusCovidTask = defaultTasks.lusCovid.getTask()

    const data = (await new NodeImageLoader(lusCovidTask)
      .loadAll(files.flat(), { labels, channels: 3 })).train
    
    // Initialize a validator instance
    const meanAggregator = new aggregator.MeanAggregator()
    const client = new clients.Local(url, lusCovidTask, meanAggregator)
    meanAggregator.setModel(await client.getLatestModel())

    const validator = new Validator(
      lusCovidTask,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client
    )

    // Assert random initialization metrics
    for await (const _ of validator.test(data));
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
  }).timeout(1000)

})
