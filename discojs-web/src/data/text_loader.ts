import * as tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs'

export class TextLoader extends data.TextLoader<File> {
  loadDatasetFrom (source: File): Promise<tf.data.Dataset<tf.TensorContainer>> {
    const file = new tf.data.FileDataSource(source)
    const dataset = new tf.data.TextLineDataset(file).filter(s => s !== ' ') // newline creates empty strings
    return Promise.resolve(dataset)
  }
}
