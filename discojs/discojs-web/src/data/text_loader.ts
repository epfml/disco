import tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs-core'

export class TextLoader extends data.TextLoader<File> {
  async loadDatasetFrom (source: File, config?: Record<string, unknown>): Promise<data.Dataset> {
    const file = new tf.data.FileDataSource(source)
    if (config !== undefined) {
      return new tf.data.CSVDataset(file, config)
    } else {
      return new tf.data.TextLineDataset(file)
    }
  }
}
