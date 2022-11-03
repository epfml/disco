import fs from 'fs/promises'
import path from 'node:path'
import { Server } from 'node:http'
import { Range } from 'immutable'

import { node, Disco, TrainingSchemes, client as clients, defaultTasks } from '@epfml/discojs-node'

import { getClient, startServer } from '../utils'

const SCHEME = TrainingSchemes.FEDERATED

describe('end to end federated', function () {
  this.timeout(60_000)

  let server: Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })

  it('runs cifar 10 with two users', async () =>
    await Promise.all([cifar10user(), cifar10user()]))

  async function cifar10user (): Promise<void> {
    const dir = '../example_training_data/CIFAR10/'
    const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
    const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

    const cifar10Task = defaultTasks.cifar10.getTask()

    const data = await new node.data.NodeImageLoader(cifar10Task).loadAll(files, { labels: labels })

    const client = await getClient(clients.federated.Client, server, cifar10Task)
    await client.connect()

    const disco = new Disco(cifar10Task, { scheme: SCHEME, client })

    await disco.fit(data)
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

    const client = await getClient(clients.federated.Client, server, titanicTask)

    const disco = new Disco(titanicTask, { scheme: SCHEME, client })

    await disco.fit(data)
  }
})
