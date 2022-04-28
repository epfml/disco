import { loadTasks } from '../src/tasks'
import dotenv from 'dotenv-flow'
import { dataset, ConsoleLogger, TrainingSchemes } from 'discojs'
import fs from 'fs'
import * as tfNode from '@tensorflow/tfjs-node'
import { Disco } from '../src/training/disco'
import { Range } from 'immutable'

export class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tfNode.Tensor3D> {
    return tfNode.node.decodeImage(fs.readFileSync(source)) as tfNode.Tensor3D
  }
}

export class NodeTabularLoader extends dataset.TabularLoader<string> {
  loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tfNode.data.CSVDataset {
    return tfNode.data.csv(source, csvConfig)
  }
}

// Setup ENV
process.env.NODE_ENV = 'development'
console.log('Setting up NODE_ENV to', process.env.NODE_ENV)
console.log('***********************************\n\n')
// Load .env.development
dotenv.config()

async function cifar10user () {
  const dir = './example_training_data/CIFAR10/'
  const files = fs.readdirSync(dir).map((file) => dir.concat(file))
  const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

  const cifar10 = (await loadTasks())[3]

  const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })

  const logger = new ConsoleLogger()
  const disco = new Disco(cifar10, logger, false)

  await disco.startTraining(loaded, TrainingSchemes.FEDERATED)
}

async function titanicUser () {
  const dir = './example_training_data/titanic.csv'

  const titanic = (await loadTasks())[0]
  const loaded = await (new NodeTabularLoader(titanic, ',').load(
    'file://'.concat(dir),
    {
      features: titanic.trainingInformation.inputColumns,
      labels: titanic.trainingInformation.outputColumns
    }
  ))

  const logger = new ConsoleLogger()

  // TODO: loaded.size is null, will be fixed when we move to batches
  const data = {
    dataset: loaded,
    size: 100
  }
  console.log('here', loaded.size)
  const disco = new Disco(titanic, logger, false)

  await disco.startTraining(data, TrainingSchemes.FEDERATED)
}

async function main () {
  console.log('Testing cifar 10')
  await Promise.all([cifar10user(), cifar10user()])
  console.log('Testing titanic')
  await Promise.all([titanicUser(), titanicUser()])
}

const runMain = async () => {
  await main()
}

runMain()
