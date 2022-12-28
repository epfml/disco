import { Server } from 'node:http'
import fs from 'fs/promises'
import path from 'node:path'

import { client as clients, defaultTasks, Disco, node, Task, TaskProvider, TrainingSchemes, Validator } from '@epfml/discojs-node'

import { expect } from 'chai'
import { getClient, startServer } from '../../utils'

const SCHEME = TrainingSchemes.FEDERATED

let initialAccuracy = 0

function endToEndTest (
  useByzantine: boolean
): void {
  describe(`end to end federated ${useByzantine ? 'using byzantine-robust aggregator' : 'using standard aggregator'}`, function () {
    this.timeout(500_00000)

    let server: Server
    let task: Task

    before(async () => {
      const tasks: TaskProvider[] = []

      if (useByzantine) {
        const cifar10Task = defaultTasks.cifar10.getTask()
        const cifar10Model = defaultTasks.cifar10.getModel()
        cifar10Task.taskID = cifar10Task.taskID + '-byzantine'
        cifar10Task.trainingInformation.byzantineRobustAggregator = true
        cifar10Task.trainingInformation.tauPercentile = 0.75

        task = cifar10Task

        tasks.push({ getTask: () => cifar10Task, getModel: async () => await cifar10Model })
      } else {
        task = defaultTasks.cifar10.getTask()
      }

      server = await startServer(tasks)
    })
    after(() => { server?.close() })

    it('runs titanic with two users', async () =>
      await Promise.all([cifar10user(0), cifar10user(1), cifar10user(2)]))

    async function cifar10user (userId: number): Promise<void> {
      const trainDir = `../example_training_data/CIFAR10/agent${userId}`
      const testDir = '../example_training_data/CIFAR10/test'
      const labelsDir = '../example_training_data/CIFAR10/labels.txt'

      const labelsMapping = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck']
      const labels: string[] = (await fs.readFile(labelsDir, 'utf-8')).split(/\r?\n/)

      const trainFiles = (await fs.readdir(trainDir)).map((file) => path.join(trainDir, file))
      const testFiles = (await fs.readdir(testDir)).map((file) => path.join(testDir, file))

      let trainLabels = trainFiles.map(filePath => labelsMapping.indexOf(labels[parseInt(path.parse(filePath).name)]).toString())
      const testLabels = testFiles.map(filePath => labelsMapping.indexOf(labels[parseInt(path.parse(filePath).name)]).toString())

      if (userId === 0) {
        trainLabels = trainLabels.map(label => (9 - parseInt(label)).toString()) // Label flipping if userId = 0
      }

      const trainData = await new node.data.NodeImageLoader(task).loadAll(trainFiles, { labels: trainLabels, validationSplit: task.trainingInformation.validationSplit })
      const testData = await new node.data.NodeImageLoader(task).loadAll(testFiles, { labels: testLabels, validationSplit: 0 })

      const client = await getClient(clients.federated.Client, server, task)
      await client.connect()

      const disco = new Disco(task, { scheme: SCHEME, client })

      await disco.fit(trainData)

      const validator = new Validator(disco.task, disco.logger, disco.memory, undefined, client)
      await validator.assess(await testData.train.preprocess())

      const accuracy = validator.accuracy()
      console.log(`TEST ACCURACY ---->  ${accuracy}`)

      expect(accuracy).to.be.greaterThan(initialAccuracy)

      initialAccuracy = accuracy
    }
  })
}

endToEndTest(false)
endToEndTest(true)
