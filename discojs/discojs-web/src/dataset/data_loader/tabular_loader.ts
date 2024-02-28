import tf from '@tensorflow/tfjs'

import { data } from '../..'

export class WebTabularLoader extends data.TabularLoader<File> {
  async loadDatasetFrom (source: File, csvConfig: Record<string, unknown>): Promise<data.Dataset> {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
