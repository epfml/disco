import * as tf from '@tensorflow/tfjs'

import { data } from '@epfml/discojs-core'

export class TabularLoader extends data.TabularLoader<File> {
  async loadDatasetFrom (source: File, csvConfig: Record<string, unknown>): Promise<data.Dataset> {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
