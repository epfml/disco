/* eslint-disable no-unused-vars */
import { loadTasks } from '../src/tasks'
import dotenv from 'dotenv-flow'
import { dataset, ConsoleLogger } from 'discojs'
import fs from 'fs'
import * as tfNode from '@tensorflow/tfjs-node'
import { Disco } from '../src/training/disco'
import { Platform } from '../src/platforms/platform'
import { getModel } from './model'

// Setup ENV
process.env.NODE_ENV = 'development'
console.log('Setting up NODE_ENV to', process.env.NODE_ENV)
console.log('***********************************\n\n')
// Load .env.development
dotenv.config()

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tfNode.Tensor3D> {
    return tfNode.node.decodeImage(fs.readFileSync(source)) as tfNode.Tensor3D
  }
}

async function loadData () {
  const dir = './example_training_data/simple_face/'
  const foldersInDir = fs.readdirSync(dir).filter(f => fs.statSync(dir + f).isDirectory())

  const filesPerFolder = foldersInDir.map((folder) => {
    const folderPath = dir.concat(folder, '/')
    const filesInFolder = fs.readdirSync(folderPath)
    return filesInFolder.map((file) => folderPath.concat(file))
  })

  const labels = filesPerFolder.flatMap((files, index) => Array(files.length).fill(index))

  const files = filesPerFolder.flat()

  console.log({ labels })
  console.log({ files })

  // shuffle(labels, files)

  console.log({ labels })

  const simpleFace = (await loadTasks())[4]
  return await new NodeImageLoader(simpleFace).loadAll(files, { labels: labels })
}

// Cannot run await in main context
async function main () {
  // const tasks = await loadTasks()
  // const task = tasks[4]

  const data = await loadData()

  const model = getModel(200, 200, 3, 2)

  const batchSize = 1

  const dataset = data.dataset.shuffle(data.size, 'seed').batch(batchSize)
  model.fitDataset(dataset, {
    epochs: 10
  })

  // const logger = new ConsoleLogger()
  // const disco = new Disco(task, Platform.federated, logger, false)
  // await disco.startTraining(data, false)
}

const runMain = async () => {
  await main()
}

runMain()
