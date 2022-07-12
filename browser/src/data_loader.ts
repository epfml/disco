import * as tf from '@tensorflow/tfjs'

import { dataset } from 'discojs'

export class WebImageLoader extends dataset.ImageLoader<File> {
  async readImageFrom (source: File): Promise<tf.Tensor3D> {
    const tensor = tf.browser.fromPixels(await createImageBitmap(source))
    return tensor.div(tf.scalar(255)) as tf.Tensor3D
  }
}

export class WebTabularLoader extends dataset.TabularLoader<File> {
  loadTabularDatasetFrom (source: File, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
