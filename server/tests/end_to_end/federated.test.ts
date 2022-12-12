import fs from 'fs/promises'
import path from 'node:path'
import { Server } from 'node:http'
import { Range } from 'immutable'

import { node, Disco, TrainingSchemes, client as clients, defaultTasks, Validator } from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'
import { expect } from 'chai'

const SCHEME = TrainingSchemes.FEDERATED

function endToEndTest (
  useByzantine: boolean
): void {
  describe(`end to end federated ${useByzantine ? 'using byzantine-robust aggregator' : 'using standard aggregator'}`, function () {
    this.timeout(60_000)

    let server: Server
    before(async () => { server = await startServer() })
    after(() => { server?.close() })

    it('runs cifar 10 with two users', async () =>
      await Promise.all([cifar10user(1, 2), cifar10user(2, 2)]))

    async function cifar10user (userId: number, totalNumber: number): Promise<void> {
      const dir = '../example_training_data/CIFAR10/'
      const files = (await fs.readdir(dir)).map((file) => path.join(dir, file)).sort()
      const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

      const testSize = Math.floor(0.2 * files.length)
      const trainSize = (files.length - testSize) * (1 / totalNumber)

      const testSet = files.slice(0, testSize)
      const testLabels = labels.slice(0, testSize)

      const trainSet = files.slice(testSize + ((userId - 1) * trainSize), testSize + (userId * trainSize))
      const trainLabels = labels.slice(testSize + ((userId - 1) * trainSize), testSize + (userId * trainSize))

      const cifar10Task = defaultTasks.cifar10.getTask()

      const trainData = await new node.data.NodeImageLoader(cifar10Task).loadAll(trainSet, { labels: trainLabels, validationSplit: cifar10Task.trainingInformation.validationSplit })
      const testData = await new node.data.NodeImageLoader(cifar10Task).loadAll(testSet, { labels: testLabels, validationSplit: 0 })

      if (useByzantine) {
        cifar10Task.trainingInformation.byzantineRobustAggregator = true
        cifar10Task.trainingInformation.tauPercentile = 0.75
      }

      const client = await getClient(clients.federated.Client, server, cifar10Task)
      await client.connect()

      const disco = new Disco(cifar10Task, { scheme: SCHEME, client })

      await disco.fit(trainData)

      const validator = new Validator(disco.task, disco.logger, disco.memory, undefined, client)
      await validator.assess(await testData.train.preprocess())

      const accuracy = validator.accuracy()
      console.log(`TEST ACCURACY ---->  ${accuracy}`)

      expect(accuracy).to.be.greaterThan(0.8)
    }

    it('runs titanic with two users', async () =>
      await Promise.all([titanicUser(), titanicUser()]))

    async function titanicUser (): Promise<void> {
      const files = ['../example_training_data/titanic_train.csv']

      // TODO: can load data, so path is right.
      // console.log(await tf.data.csv('file://'.concat(dir)).toArray())
      const titanicTask = defaultTasks.titanic.getTask()
      const data = await (new node.data.NodeTabularLoader(titanicTask, ',').loadAll(
        files,
        {
          features: titanicTask.trainingInformation.inputColumns,
          labels: titanicTask.trainingInformation.outputColumns,
          shuffle: false
        }
      ))

      if (useByzantine) {
        titanicTask.trainingInformation.byzantineRobustAggregator = true
        titanicTask.trainingInformation.tauPercentile = 0.75
      }

      const client = await getClient(clients.federated.Client, server, titanicTask)

      const disco = new Disco(titanicTask, { scheme: SCHEME, client })

      await disco.fit(data)
    }
  })
}

endToEndTest(false)
endToEndTest(true)
