import fs from 'node:fs/promises'
import type tf from '@tensorflow/tfjs'
import { node as tfNode } from '@tensorflow/tfjs-node'

import { data } from '@epfml/discojs'

export class ImageLoader extends data.ImageLoader<string> {
  async readImageFrom(source: string, channels?: number): Promise<tf.Tensor3D> {
    // We allow specifying the number of channels because the default number of channels
    // differs between web and node for the same image 
    // E.g. lus covid images have 1 channel with fs.readFile but 3 when loaded with discojs-web
    return tfNode.decodeImage(await fs.readFile(source), channels) as tf.Tensor3D
  }
}
