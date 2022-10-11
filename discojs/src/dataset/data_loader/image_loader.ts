import { tf, dataset } from '../..'

export class WebImageLoader extends dataset.ImageLoader<File> {
  async readImageFrom (source: File): Promise<tf.Tensor3D> {
    return tf.browser.fromPixels(await createImageBitmap(source))
  }
}
