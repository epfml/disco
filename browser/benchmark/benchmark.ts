import { loadTasks } from '../src/tasks'
import dotenv from 'dotenv-flow'
import { dataset, ConsoleLogger } from 'discojs'
import fs from 'fs'
import * as tfNode from '@tensorflow/tfjs-node'
import { Disco } from '../src/training/disco'
import { Platform } from '../src/platforms/platform'
import * as tf from '@tensorflow/tfjs'
import Rand from 'rand-seed'
// import { Set } from 'immutable'

const TASK_INDEX = 4

// Setup ENV
process.env.NODE_ENV = 'development'
console.log('Setting up NODE_ENV to', process.env.NODE_ENV)
console.log('***********************************\n\n')
// Load .env.development
dotenv.config()

const rand = new Rand('1234')

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tfNode.Tensor3D> {
    const imageBuffer = fs.readFileSync(source)
    let tensor = tfNode.node.decodeImage(imageBuffer) as tf.Tensor3D
    // TODO: If resize needed, e.g. mobilenet
    // tensor = tf.image.resizeBilinear(tensor, [
    //   32, 32
    // ]).div(tf.scalar(255))
    tensor = tensor.div(tf.scalar(255))
    return tensor
  }
}

function shuffle (array: any[], arrayTwo: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand.next() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp

    const tempTwo = arrayTwo[i]
    arrayTwo[i] = arrayTwo[j]
    arrayTwo[j] = tempTwo
  }
}

function filesFromFolder (dir: string, folder: string, fractionToKeep: number) {
  const f = fs.readdirSync(dir + folder)
  return f.slice(0, Math.round(f.length * fractionToKeep)).map(file => dir + folder + '/' + file)
}

async function loadData (validSplit = 0.2) {
  // const dir = '../../face_age/'
  const dir = './example_training_data/simple_face/'

  const youngFolders = ['child']// ['007', '008', '009', '010', '011', '012', '013', '014']
  const oldFolders = ['adult']// ['021', '022', '023', '024', '025', '026']

  // TODO: we just keep x% of data for faster training
  const fractionToKeep = 0.1
  const youngFiles = youngFolders.flatMap(folder => {
    return filesFromFolder(dir, folder, fractionToKeep)
  })

  const oldFiles = oldFolders.flatMap(folder => {
    return filesFromFolder(dir, folder, fractionToKeep)
  })

  const filesPerFolder = [youngFiles, oldFiles]

  const labels = filesPerFolder.flatMap((files, index) => Array(files.length).fill(index))
  const files = filesPerFolder.flat()

  shuffle(files, labels)

  const trainFiles = files.slice(0, Math.round(files.length * (1 - validSplit)))
  const trainLabels = labels.slice(0, Math.round(files.length * (1 - validSplit)))

  const validFiles = files.slice(Math.round(files.length * (1 - validSplit)))
  const validLabels = labels.slice(Math.round(files.length * (1 - validSplit)))

  const simpleFace = (await loadTasks())[TASK_INDEX]
  const trainDataset = await new NodeImageLoader(simpleFace).loadAll(trainFiles, { labels: trainLabels })
  const validDataset = await new NodeImageLoader(simpleFace).loadAll(validFiles, { labels: validLabels })

  return {
    train: trainDataset,
    valid: validDataset
  }
}

async function runUser () {
  const tasks = await loadTasks()
  const task = tasks[TASK_INDEX]
  const data = await loadData()

  const logger = new ConsoleLogger()
  const disco = new Disco(task, Platform.federated, logger, false)
  disco.startTraining(data.train, data.valid, true)
}

async function main () {
  await Promise.all([runUser(), runUser()])
  // await runUser()
}

const runMain = async () => {
  await main()
}

runMain()
