import * as tf from '@tensorflow/tfjs'
import { data as tfData } from '@tensorflow/tfjs-node'

import { data } from '@epfml/discojs'

export class TabularLoader extends data.TabularLoader<string> {
  loadDatasetFrom (source: string, csvConfig: Record<string, unknown>): Promise<tfData.Dataset<tf.TensorContainer>> {
    const prefix = 'file://'
    if (source.slice(0, 7) !== prefix) {
      source = prefix + source
    }
    return Promise.resolve(tfData.csv(source, csvConfig))
  }
}
