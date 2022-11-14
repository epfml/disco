import fs from 'fs'
import Rand from 'rand-seed'

import { node, data, Task } from '@epfml/discojs-node'

const rand = new Rand('1234')

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

function filesFromFolder (dir: string, folder: string): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.map(file => dir + folder + '/' + file)
}

export async function loadData (task: Task): Promise<data.DataSplit> {
  const dir = '../../example_training_data/simple_face/'
  const youngFolders = ['child']
  const oldFolders = ['adult']

  const youngFiles = youngFolders.flatMap(folder => {
    return filesFromFolder(dir, folder)
  })

  const oldFiles = oldFolders.flatMap(folder => {
    return filesFromFolder(dir, folder)
  })

  const filesPerFolder = [youngFiles, oldFiles]

  const labels = filesPerFolder.flatMap((files, index) => Array(files.length).fill(index))
  const files = filesPerFolder.flat()

  shuffle(files, labels)

  return await new node.data.NodeImageLoader(task).loadAll(files, { labels: labels })
}
