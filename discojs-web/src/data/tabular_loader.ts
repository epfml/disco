import * as tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs'

export class TabularLoader extends data.TabularLoader<File> {
  async loadDatasetFrom (source: File, csvConfig: Record<string, unknown>): Promise<tf.data.Dataset<tf.TensorContainer>> {
    const file = new tf.data.FileDataSource(source)
    return Promise.resolve(new tf.data.CSVDataset(file, csvConfig))
  }
}
