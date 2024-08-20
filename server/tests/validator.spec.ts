import * as fs from 'node:fs'
import { assert } from 'chai';
import type * as http from "node:http";

import {
  Validator, ConsoleLogger, EmptyMemory, client as clients,
  aggregator as aggregators, defaultTasks, data
} from '@epfml/discojs'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'

import { Server } from "../src/index.js";

describe('validator', function () {
  this.timeout(10_000);

  let server: http.Server;
  let url: URL;
  beforeEach(async () => {
    [server, url] = await Server.of(
      defaultTasks.simpleFace,
      defaultTasks.lusCovid,
      defaultTasks.titanic,
    ).then((s) => s.serve());
  });
  afterEach(() => server?.close());

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

    const simpleFaceTask = defaultTasks.simpleFace.getTask()

    const data = (await new NodeImageLoader(simpleFaceTask)
      .loadAll(files.flat(), { labels, channels: undefined })).train
    
    // Init a validator instance
    const meanAggregator = aggregators.getAggregator(simpleFaceTask, {scheme: 'local'})
    const client = new clients.LocalClient(url, simpleFaceTask, meanAggregator)
    const validator = new Validator(
      simpleFaceTask,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      client
    )

    // Read data and predict with an untrained model
    for await (const _ of validator.test(data));
    const size = data.size ?? -1
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
    const meanAggregator = aggregators.getAggregator(titanicTask, {scheme: 'local'})
    const client = new clients.LocalClient(url, titanicTask, meanAggregator)
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
    const meanAggregator = aggregators.getAggregator(lusCovidTask, {scheme: 'local'})
    const client = new clients.LocalClient(url, lusCovidTask, meanAggregator)

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
