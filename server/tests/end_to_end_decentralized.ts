import fs from 'fs/promises'
import path from 'node:path'
import { Server } from 'node:http'
import { Range } from 'immutable'
import * as tf from '@tensorflow/tfjs-node'

import { dataset, ConsoleLogger, training, TrainingSchemes, TrainingInformant, EmptyMemory, tasks, client, Weights } from 'discojs'

import { getClient, startServer } from './utils'

const SCHEME = TrainingSchemes.DECENTRALIZED

function makeWeights (values: any): Weights {
  const w: Weights = []
  for (let i = 0; i < 1; i++) {
    w.push(tf.tensor(values))
  }
  return w
}

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    const image = await fs.readFile(source)
    return tf.node.decodeImage(image) as tf.Tensor3D
  }
}

// class NodeTabularLoader extends dataset.TabularLoader<string> {
//   loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
//     return tf.data.csv(source, csvConfig)
//   }
// }

describe('end to end', function () {
  this.timeout(60_000)

  let server: Server
  before(async () => {
    server = await startServer()
  })
  after(() => {
    server?.close()
  })

  it('runs cifar 10 with two users', async () =>
    await Promise.all([cifar10user(), cifar10user()]))

  async function cifar10user (): Promise<void> {
    const dir = '../discojs/example_training_data/CIFAR10/'
    const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
    const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

    const cifar10 = tasks.cifar10.task

    const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })

    const cli = await getClient(client.InsecureDecentralized, server, cifar10)
    await cli.connect()

    const disco = new training.Disco(
      cifar10,
      new ConsoleLogger(),
      new EmptyMemory(),
      SCHEME,
      new TrainingInformant(10, cifar10.taskID, SCHEME),
      cli
    )
    const updated: Weights = makeWeights([1, 10, 3])
    await cli.onRoundEndCommunication(updated, updated, 0, new TrainingInformant(10, cifar10.taskID, SCHEME))
    await disco.startTraining(loaded)
  }
}
)
