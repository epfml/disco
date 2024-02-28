import tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs-core'

export class ImageLoader extends data.ImageLoader<File> {
  async readImageFrom (source: File): Promise<tf.Tensor3D> {
    return tf.browser.fromPixels(await createImageBitmap(source))
  }
}
