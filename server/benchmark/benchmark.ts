import fs from 'fs'
import * as http from 'http'
import * as tf from '@tensorflow/tfjs'
import * as tfNode from '@tensorflow/tfjs-node'
import Rand from 'rand-seed'

import { getApp } from '../src/get_server'
import { client as clients, dataset, tasks, ConsoleLogger, training, TrainingSchemes, EmptyMemory, TrainingInformant } from 'discojs'

const TASK = tasks.simple_face.task

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

function shuffle<T, U> (array: T[], arrayTwo: U[]): void {
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

function filesFromFolder (dir: string, folder: string, fractionToKeep: number): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.slice(0, Math.round(f.length * fractionToKeep)).map(file => dir + folder + '/' + file)
}

async function loadData (validSplit = 0.2): Promise<Record<'train' | 'valid', dataset.Data>> {
  const dir = './../discojs/example_training_data/simple_face/'
  const youngFolders = ['child']
  const oldFolders = ['adult']

  // const dir = '../../face_age/'
  // const youngFolders = ['007', '008', '009', '010', '011', '012', '013', '014']
  // const oldFolders = ['021', '022', '023', '024', '025', '026']

  // TODO: we just keep x% of data for faster training, e.g., for each folder, we keep 0.1 fraction of images
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

  const trainDataset = await new NodeImageLoader(TASK).loadAll(trainFiles, { labels: trainLabels })
  const validDataset = await new NodeImageLoader(TASK).loadAll(validFiles, { labels: validLabels })

  return {
    train: trainDataset,
    valid: validDataset
  }
}

async function runUser (url: URL): Promise<void> {
  const data = await loadData()

  const logger = new ConsoleLogger()
  const memory = new EmptyMemory()

  const informant = new TrainingInformant(10, TASK.taskID, TrainingSchemes.FEDERATED)
  const client = new clients.Federated(url, TASK)
  await client.connect()
  const disco = new training.Disco(TASK, logger, memory, TrainingSchemes.FEDERATED, informant, client)

  console.log('runUser>>>>')
  await disco.startTraining(data.train)
  console.log('runUser<<<<')
}

async function startServer (): Promise<[http.Server, string]> {
  const app = await getApp()
  const server = http.createServer(app).listen()
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
    server.on('error', console.error)
  })
  const rawAddr = server.address()

  // TODO copied from tests/federated_client
  let addr: string
  if (rawAddr === null) {
    throw new Error('unable to get server address')
  } else if (typeof rawAddr === 'string') {
    addr = rawAddr
  } else if (typeof rawAddr === 'object') {
    if (rawAddr.family === '4') {
      addr = `${rawAddr.address}:${rawAddr.port}`
    } else {
      addr = `[${rawAddr.address}]:${rawAddr.port}`
    }
  } else {
    throw new Error('unable to get address to server')
  }

  return [server, addr]
}

async function main (): Promise<void> {
  const [server, addr] = await startServer()
  const url = new URL('', `http://${addr}`)

  await Promise.all([
    runUser(url),
    runUser(url)
  ])

  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main().catch(console.error)
