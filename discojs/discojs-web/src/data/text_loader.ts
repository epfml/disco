import * as tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs-core'

export class TextLoader extends data.TextLoader<File> {
  async loadDatasetFrom (source: File): Promise<data.Dataset> {
    const file = new tf.data.FileDataSource(source)
    return new tf.data.TextLineDataset(file)
  }
}
