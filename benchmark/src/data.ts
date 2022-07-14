import * as tf from '@tensorflow/tfjs'
import * as tfNode from '@tensorflow/tfjs-node'
import fs from 'fs'
import {dataset, Task} from 'discojs'

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom(source: string): Promise<tfNode.Tensor3D> {
    const imageBuffer = fs.readFileSync(source)
    let tensor = tfNode.node.decodeImage(imageBuffer)
    // TODO: If resize needed, e.g. mobilenet
    // tensor = tf.image.resizeBilinear(tensor, [
    //   32, 32
    // ]).div(tf.scalar(255))
    tensor = tensor.div(tf.scalar(255))
    return tensor as tf.Tensor3D
  }
}

function filesFromFolder(dir: string, folder: string, fractionToKeep: number): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.slice(0, Math.round(f.length * fractionToKeep)).map(file => dir + folder + '/' + file)
}

export async function loadData(task: Task): Promise<dataset.DataTuple> {
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

  return await new NodeImageLoader(task).loadAll(files, {labels: labels})
}


