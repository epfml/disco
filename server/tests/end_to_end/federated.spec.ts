import fs from 'fs/promises'
import path from 'node:path'
import { Server } from 'node:http'

import { node, Disco, TrainingSchemes, client as clients, defaultTasks, Validator } from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'
import { expect } from 'chai'

const SCHEME = TrainingSchemes.FEDERATED

describe('end to end federated using standard aggregator', function () {
  this.timeout(80000_000)

  let server: Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('runs cifar 10 with two users', async () =>
    await Promise.all([cifar10user(0), cifar10user(1)]))

  async function cifar10user (userId: number): Promise<void> {
    const trainDir = `../example_training_data/CIFAR10/agent${userId}`
    const testDir = '../example_training_data/CIFAR10/test'
    const labelsDir = '../example_training_data/CIFAR10/labels.txt'

    const labelsMapping = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truc']
    const labels: string[] = (await fs.readFile(labelsDir, 'utf-8')).split(/\r?\n/)

    const trainFiles = (await fs.readdir(trainDir)).map((file) => path.join(trainDir, file))
    const testFiles = (await fs.readdir(testDir)).map((file) => path.join(testDir, file))

    const trainLabels = trainFiles.map(filePath => labelsMapping.indexOf(labels[parseInt(path.parse(filePath).name)]).toString())
    const testLabels = testFiles.map(filePath => labelsMapping.indexOf(labels[parseInt(path.parse(filePath).name)]).toString())

    const cifar10Task = defaultTasks.cifar10.getTask()

    const trainData = await new node.data.NodeImageLoader(cifar10Task).loadAll(trainFiles, { labels: trainLabels, validationSplit: cifar10Task.trainingInformation.validationSplit })
    const testData = await new node.data.NodeImageLoader(cifar10Task).loadAll(testFiles, { labels: testLabels, validationSplit: 0 })

    const client = await getClient(clients.federated.Client, server, cifar10Task)
    await client.connect()

    const disco = new Disco(cifar10Task, { scheme: SCHEME, client })

    await disco.fit(trainData)

    const validator = new Validator(disco.task, disco.logger, disco.memory, undefined, client)
    await validator.assess(await testData.train.preprocess())

    const accuracy = validator.accuracy()
    console.log(`TEST ACCURACY ---->  ${accuracy}`)

    expect(accuracy).to.be.greaterThan(0.2)
  }

  it('runs titanic with two users', async () =>
    await Promise.all([titanicUser(0), titanicUser(1)]))

  async function titanicUser (userId: number): Promise<void> {
    const trainFiles = ['../example_training_data/titanic/titanic_train_all.csv']
    const testFiles = ['../example_training_data/titanic/titanic_test_with_labels.csv']

    // TODO: can load data, so path is right.
    // console.log(await tf.data.csv('file://'.concat(dir)).toArray())
    const titanicTask = defaultTasks.titanic.getTask()

    const trainData = await (new node.data.NodeTabularLoader(titanicTask, ',').loadAll(
      trainFiles,
      {
        features: titanicTask.trainingInformation.inputColumns,
        labels: titanicTask.trainingInformation.outputColumns,
        shuffle: false
      }
    ))

    const testData = await (new node.data.NodeTabularLoader(titanicTask, ',').loadAll(
      testFiles,
      {
        features: titanicTask.trainingInformation.inputColumns,
        labels: titanicTask.trainingInformation.outputColumns,
        shuffle: false
      }
    ))

    const client = await getClient(clients.federated.Client, server, titanicTask)
    await client.connect()

    const disco = new Disco(titanicTask, { scheme: SCHEME, client })

    await disco.fit(trainData)

    const validator = new Validator(disco.task, disco.logger, disco.memory, undefined, client)
    await validator.assess(await testData.train.preprocess())

    const accuracy = validator.accuracy()
    console.log(`TEST ACCURACY ---->  ${accuracy}`)

    expect(accuracy).to.be.greaterThan(0.7)
  }
})
