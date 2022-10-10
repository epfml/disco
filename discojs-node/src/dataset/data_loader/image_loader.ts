import fs from 'fs'

import { tf, dataset } from '../..'

export class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    return tf.node.decodeImage(fs.readFileSync(source)) as tf.Tensor3D
  }
}
