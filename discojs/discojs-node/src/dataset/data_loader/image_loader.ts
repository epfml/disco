import fs from 'fs'

import { tf, data } from '../..'

export class NodeImageLoader extends data.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    return tf.node.decodeImage(fs.readFileSync(source)) as tf.Tensor3D
  }
}
