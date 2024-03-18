import * as tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs-core'

export class TextLoader extends data.TextLoader<File> {
  loadDatasetFrom (source: File): Promise<data.Dataset> {
    const file = new tf.data.FileDataSource(source)
    return Promise.resolve(new tf.data.TextLineDataset(file))
  }
}
