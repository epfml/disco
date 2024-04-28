import fs from 'node:fs/promises'
import path from 'node:path'
import type { Server } from 'node:http'
import { List, Range } from 'immutable'
import { assert, expect } from 'chai'

import type { RoundLogs, WeightsContainer } from '@epfml/discojs-core'
import {
  Disco, client as clients, data,
  aggregator as aggregators, defaultTasks
} from '@epfml/discojs-core'
import { NodeImageLoader, NodeTabularLoader, NodeTextLoader } from '@epfml/discojs-node'

import { startServer } from '../../src/index.js'

describe("end-to-end federated", function () {
  let server: Server;
  let url: URL;
  beforeEach(async function () {
    this.timeout("5s");
    [server, url] = await startServer();
  });
  afterEach(() => {
    server?.close();
  });

  const DATASET_DIR = '../datasets/'

  async function cifar10user (): Promise<WeightsContainer> {
    const dir = DATASET_DIR + 'CIFAR10/'
    const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
    const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

    const cifar10Task = defaultTasks.cifar10.getTask()

    const data = await new NodeImageLoader(cifar10Task).loadAll(files, { labels, shuffle: false })

    const aggregator = new aggregators.MeanAggregator()
    const client = new clients.federated.FederatedClient(url, cifar10Task, aggregator)
    const disco = new Disco(cifar10Task, { scheme: 'federated', client })

    for await (const _ of disco.fit(data));
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    return aggregator.model.weights
  }

  async function titanicUser (): Promise<WeightsContainer> {
    const files = [DATASET_DIR + 'titanic_train.csv']

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

    let logs = List<RoundLogs>()
    for await (const round of disco.fit(data)) {
      logs = logs.push(round)
    }
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    expect(logs.last()?.epochs.last()?.training.accuracy).to.be.greaterThan(0.6)
    if (logs.last()?.epochs.last()?.validation === undefined) {
      throw new Error('No validation logs while validation dataset was specified')
    } 
    const validationLogs = logs.last()?.epochs.last()?.validation
    expect(validationLogs?.accuracy).to.be.greaterThan(0.6)
    return aggregator.model.weights
  }

  async function wikitextUser (): Promise<void> {
    const task = defaultTasks.wikitext.getTask()
    task.trainingInformation.epochs = 2
    const loader = new NodeTextLoader(task)
    const dataSplit: data.DataSplit = {
      train: await data.TextData.init((await loader.load(DATASET_DIR + 'wikitext/wiki.train.tokens')), task),
      validation: await data.TextData.init(await loader.load(DATASET_DIR + 'wikitext/wiki.valid.tokens'), task)
    }

    const aggregator = new aggregators.MeanAggregator()
    const client = new clients.federated.FederatedClient(url, task, aggregator)
    const disco = new Disco(task, { scheme: 'federated', client, aggregator })

    let logs = List<RoundLogs>()
    for await (const round of disco.fit(dataSplit)) {
      logs = logs.push(round)
    }
    await disco.close()

    expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
      logs.last()?.epochs.last()?.training.loss as number,
    );
  }

  async function lusCovidUser (): Promise<WeightsContainer> {
    const dir = DATASET_DIR + 'lus_covid/'
    const files = await Promise.all(['COVID+/', 'COVID-/'].map(async (subdir: string) => {
      return (await fs.readdir(dir + subdir))
        .map((file: string) => dir + subdir + file)
        .filter((path: string) => path.endsWith('.png'))
    }))

    const positiveLabels = files[0].map(_ => 'COVID-Positive')
    const negativeLabels = files[1].map(_ => 'COVID-Negative')
    const labels = positiveLabels.concat(negativeLabels)
    const lusCovidTask = defaultTasks.lusCovid.getTask()

    const data = await new NodeImageLoader(lusCovidTask)
      .loadAll(files.flat(), { labels, channels: 3 })

    const aggregator = new aggregators.MeanAggregator()
    const client = new clients.federated.FederatedClient(url, lusCovidTask, aggregator)
    const disco = new Disco(lusCovidTask, { scheme: 'federated', client })

    let logs = List<RoundLogs>()
    for await (const round of disco.fit(data)) {
      logs = logs.push(round)
    }
    await disco.close()

    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    const validationLogs = logs.last()?.epochs.last()?.validation
    expect(validationLogs?.accuracy).to.be.greaterThan(0.6)
    return aggregator.model.weights
  }

  it("two cifar10 users reach consensus", async function () {
    this.timeout(90_000);

    const [m1, m2] = await Promise.all([cifar10user(), cifar10user()]);
    assert.isTrue(m1.equals(m2))
  });

  it("two titanic users reach consensus", async function () {
    this.timeout(30_000);

    const [m1, m2] = await Promise.all([titanicUser(), titanicUser()]);
    assert.isTrue(m1.equals(m2))
  });
  it("two lus_covid users reach consensus", async function () {
    this.timeout(30_000);

    const [m1, m2] = await Promise.all([lusCovidUser(), lusCovidUser()]);
    assert.isTrue(m1.equals(m2))
  });

  it("trains wikitext", async function () {
    this.timeout("3m");

    await wikitextUser();
  });
})
