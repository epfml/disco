import fs from 'fs'
import type tf from '@tensorflow/tfjs'
import { node } from '@tensorflow/tfjs-node'

import { data } from '@epfml/discojs-core'

export class ImageLoader extends data.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    return node.decodeImage(fs.readFileSync(source)) as tf.Tensor3D
  }
}
