import * as tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs-core'

export class TabularLoader extends data.TabularLoader<File> {
  async loadDatasetFrom (source: File, csvConfig: Record<string, unknown>): Promise<data.Dataset> {
    const file = new tf.data.FileDataSource(source)
    return Promise.resolve(new tf.data.CSVDataset(file, csvConfig))
  }
}
