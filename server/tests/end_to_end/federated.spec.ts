import { Server } from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import { expect } from 'chai'
import { Range } from 'immutable'

import { client as clients, defaultTasks, Disco, node, Task, TaskProvider, TrainingSchemes, Validator } from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'

const SCHEME = TrainingSchemes.FEDERATED
const DATA_DIR = '../example_training_data'

let initialAccuracy = 0

async function cifar10user (userId: number, task: Task, server: Server): Promise<void> {
  const dataDir = path.join(DATA_DIR, 'cifar10-agents')
  const trainDir = path.join(dataDir, `agent${userId}`)
  const testDir = path.join(dataDir, 'test')
  const labelsDir = path.join(dataDir, 'labels.txt')

  const labelsMapping = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck']
  const labels: string[] = fs.readFileSync(labelsDir, 'utf-8').split(/\r?\n/)

  // For some unknown reason, files read on a UNIX file system are given a prefix ("._"),
  // causing the CI/CD to fail. To be investigated further.
  const trainFiles = fs.readdirSync(trainDir).map((file) => path.join(trainDir, file.replace('._', '')))
  const testFiles = fs.readdirSync(testDir).map((file) => path.join(testDir, file.replace('._', '')))

  let trainLabels = trainFiles.map(filePath => labelsMapping.indexOf(labels[parseInt(path.parse(filePath).name)]).toString())
  const testLabels = testFiles.map(filePath => labelsMapping.indexOf(labels[parseInt(path.parse(filePath).name)]).toString())

  if (userId === 0) {
    // Label flipping if userId = 0
    trainLabels = trainLabels.map(label => (labelsMapping.length - parseInt(label) - 1).toString())
  }

  const trainData = await new node.data.NodeImageLoader(task).loadAll(trainFiles, { labels: trainLabels, validationSplit: task.trainingInformation.validationSplit })
  const testData = await new node.data.NodeImageLoader(task).loadAll(testFiles, { labels: testLabels, validationSplit: 0 })

  const client = await getClient(clients.federated.Client, server, task)
  await client.connect()
  const disco = new Disco(task, { scheme: SCHEME, client })
  await disco.fit(trainData)

  const validator = new Validator(disco.task, disco.logger, disco.memory, undefined, client)
  await validator.assess(await testData.train.preprocess())

  const accuracy = validator.accuracy
  console.log(`TEST ACCURACY ---->  ${accuracy}`)

  expect(accuracy).to.be.greaterThanOrEqual(initialAccuracy)

  initialAccuracy = accuracy
}

async function titanicUser (server: Server): Promise<void> {
  const titanicTask = defaultTasks.titanic.getTask()

  const files = [path.join(DATA_DIR, 'titanic_train.csv')]
  const data = await (new node.data.NodeTabularLoader(titanicTask, ',').loadAll(
    files,
    {
      features: titanicTask.trainingInformation.inputColumns,
      labels: titanicTask.trainingInformation.outputColumns,
      shuffle: false
    }
  ))

  const client = await getClient(clients.federated.Client, server, titanicTask)
  const disco = new Disco(titanicTask, { scheme: SCHEME, client })
  await disco.fit(data)
}

function endToEndTest (useByzantine: boolean): void {
  describe(`end to end federated ${useByzantine ? 'using byzantine-robust aggregator' : 'using standard aggregator'}`, function () {
    this.timeout(300_000)

    let server: Server
    // Init mock task object for CIFAR-10
    const task = defaultTasks.cifar10.getTask()

    beforeEach(async () => {
      const tasks: TaskProvider[] = []

      if (useByzantine) {
        task.taskID = task.taskID + '-mock-byzantine'
        task.trainingInformation.byzantineRobustAggregator = true
        task.trainingInformation.tauPercentile = 0.75
      } else {
        task.taskID = task.taskID + '-mock'
      }
      task.trainingInformation.epochs = 3
      task.trainingInformation.roundDuration = 4

      tasks.push({ getTask: () => task, getModel: defaultTasks.cifar10.getModel })
      server = await startServer(tasks)
    })
    afterEach(() => { server?.close() })

    it('runs cifar10 with three users', async () =>
      await Promise.all(Range(0, 3).map(async (id) =>
        await cifar10user(id, task, server)).toArray()))

    if (!useByzantine) {
      it('runs titanic with three users', async () =>
        await Promise.all(Range(0, 3).map(async () =>
          await titanicUser(server)).toArray()))
    }
  })
}

endToEndTest(false)
endToEndTest(true)
