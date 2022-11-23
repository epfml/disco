import { Range } from 'immutable'
import fs from 'node:fs'
import fs_promises from 'fs/promises'
import path from 'node:path'

import { tf, node, data, Task, ConsoleLogger } from '@epfml/discojs-node'

function filesFromFolder (dir: string, folder: string, fractionToKeep: number): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.slice(0, Math.round(f.length * fractionToKeep)).map(file => dir + folder + '/' + file)
}

async function simplefaceData (task: Task): Promise<data.DataSplit> {
  const dir = '../example_training_data/simple_face/'
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

  return await new node.data.NodeImageLoader(task).loadAll(files, { labels: labels })
}

async function cifar10Data (cifar10: Task): Promise<data.DataSplit> {
  const dir = '../example_training_data/CIFAR10/'
  const files = (await fs_promises.readdir(dir)).map((file) => path.join(dir, file))
  const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

  return await new node.data.NodeImageLoader(cifar10).loadAll(files, { labels: labels })
}

class NodeTabularLoader extends data.TabularLoader<string> {
  loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    console.log('loading!>>', source)
    return tf.data.csv(source, csvConfig)
  }
}

async function titanicData (titanic: Task): Promise<data.DataSplit> {
  const dir = '../example_training_data/titanic.csv'

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

async function omniglotData (prototypical: Task): Promise<data.DataSplit> {
  const dir = '../example_training_data/omniglot/images_background/'
  const files = await getFiles(dir)

  const labels = files.map((file) => path.dirname(file).replace(path.resolve(dir) + path.sep, '').replace(new RegExp(path.sep, 'g'), '_'))

  const labelEncoding = labels.filter((v,i,a)=>a.indexOf(v)==i).reduce((map, elem, index) => map.set(elem, index), new Map())
  // console.log(uniqueLabels)
  return await new node.data.NodeImageLoader(prototypical).loadAll(files,
     { labels: labels.map((label) => labelEncoding.get(label)),
       shuffle: true })
}

async function getFiles(dir: string): Promise<string[]> {
  const dirents: fs.Dirent[] = await fs_promises.readdir(dir, { withFileTypes: true })
  const files: (string[])[] = await Promise.all(dirents.map((dirent) => {
    const res: string = path.resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : [res]
  }))
  return files.flat()
}

export async function getTaskData (task: Task): Promise<data.DataSplit> {
  if (task.taskID === 'simple_face') {
    return await simplefaceData(task)
  }
  if (task.taskID === 'titanic') {
    return await titanicData(task)
  }
  if (task.taskID === 'cifar10') {
    return await cifar10Data(task)
  }
  if (task.taskID === 'prototypical') {
    return await omniglotData(task)
  }
  throw Error(`Data loader for ${task.taskID} not implemented.`)
}
