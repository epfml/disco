import fs from 'fs'
import Rand from 'rand-seed'
import path from 'path'

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
  const dir = '../../example_training_data/cub200_cropped/train_cropped/';

  // Get a list of all subfolders (classes) in the dataset directory
  const subfolders = fs.readdirSync(dir).filter(item => fs.statSync(path.join(dir, item)).isDirectory());

  const allFiles = [];
  const allLabels = [];

  for (let classIndex = 0; classIndex < subfolders.length; classIndex++) {
    const folder = subfolders[classIndex];
    const filesInFolder = filesFromFolder(dir, folder);

    // const classLabels = Array(filesInFolder.length).fill(classIndex).map(label => ({ 'logits': label, 'min_distances': label }));

    allFiles.push(...filesInFolder);
    allLabels.push(...Array(filesInFolder.length).fill(classIndex));
  }

  shuffle(allFiles, allLabels)

  return await new node.data.NodeMulImageLoader(task).loadAll(allFiles, { labels: allLabels })
}
