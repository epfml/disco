import * as tf from '@tensorflow/tfjs-node'
import fs from 'fs'
import fs_promises from 'fs/promises'
import { dataset, Task } from '.'

import path from 'node:path'
import { Range } from 'immutable'

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    const imageBuffer = fs.readFileSync(source)
    const tensor = tf.node.decodeImage(imageBuffer)
    return tensor as tf.Tensor3D
  }
}

function filesFromFolder (dir: string, folder: string, fractionToKeep: number): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.slice(0, Math.round(f.length * fractionToKeep)).map(file => dir + folder + '/' + file)
}

async function simplefaceData (task: Task): Promise<dataset.DataSplit> {
  const dir = './../discojs/example_training_data/simple_face/'
  const youngFolders = ['child']
  const oldFolders = ['adult']

  // const dir = '../../face_age/'
  // const youngFolders = ['007', '008', '009', '010', '011', '012', '013', '014']
  // const oldFolders = ['021', '022', '023', '024', '025', '026']

  // TODO: we just keep x% of data for faster training, e.g., for each folder, we keep 0.1 fraction of images
  const fractionToKeep = 1
  const youngFiles = youngFolders.flatMap(folder => {
    return filesFromFolder(dir, folder, fractionToKeep)
  })

  const oldFiles = oldFolders.flatMap(folder => {
    return filesFromFolder(dir, folder, fractionToKeep)
  })

  const filesPerFolder = [youngFiles, oldFiles]

  const labels = filesPerFolder.flatMap((files, index) => Array(files.length).fill(index))
  const files = filesPerFolder.flat()

  return await new NodeImageLoader(task).loadAll(files, { labels: labels })
}

async function cifar10Data (cifar10: Task): Promise<dataset.DataSplit> {
  const dir = '../discojs/example_training_data/CIFAR10/'
  const files = (await fs_promises.readdir(dir)).map((file) => path.join(dir, file))
  const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

  return await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })
}

class NodeTabularLoader extends dataset.TabularLoader<string> {
  loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    console.log('loading!>>', source)
    return tf.data.csv(source, csvConfig)
  }
}

async function titanicData (titanic: Task): Promise<dataset.DataSplit> {
  const dir = '../discojs/example_training_data/titanic.csv'

  // TODO: can load data, so path is right.
  // console.log(await tf.data.csv('file://'.concat(dir)).toArray())
  const data = await (new NodeTabularLoader(titanic, ',').loadAll(
    ['file://'.concat(dir)],
    {
      features: titanic.trainingInformation?.inputColumns,
      labels: titanic.trainingInformation?.outputColumns,
      shuffle: false
    }
  ))

  return data
}

export async function getTaskData (task: Task): Promise<dataset.DataSplit> {
  if (task.taskID === 'simple_face') {
    return await simplefaceData(task)
  }
  if (task.taskID === 'titanic') {
    return await titanicData(task)
  }
  if (task.taskID === 'cifar10') {
    return await cifar10Data(task)
  }
  throw Error(`Data loader for ${task.taskID} not implemented.`)
}
