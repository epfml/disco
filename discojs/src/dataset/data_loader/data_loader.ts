import * as tf from '@tensorflow/tfjs'

import type { DataSplit } from '../index.js'

export interface DataConfig {
  features?: string[],
  labels?: string[],
  shuffle?: boolean,
  validationSplit?: number,
  inference?: boolean,
  // Mostly used for reading lus_covid images with 3 channels (default is 1 and causes an error)
  channels?:number
}

export abstract class DataLoader<Source> {
  abstract load (source: Source, config: DataConfig): Promise<tf.data.Dataset<tf.TensorContainer>>
  abstract loadAll (sources: Source[], config: DataConfig): Promise<DataSplit>
}
