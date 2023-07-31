import { tf, data } from '../..'
import { Dataset } from '../../core/dataset'

export class NodeTabularLoader extends data.TabularLoader<string> {
  async loadDatasetFrom (source: string, csvConfig: Record<string, unknown>): Promise<Dataset> {
    const prefix = 'file://'
    if (source.slice(0, 7) !== prefix) {
      source = prefix + source
    }
    return tf.data.csv(source, csvConfig)
  }
}
