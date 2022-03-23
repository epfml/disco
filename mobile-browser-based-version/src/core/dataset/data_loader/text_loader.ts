import { DataLoader } from './data_loader'
import * as tf from '@tensorflow/tfjs'
import _ from 'lodash'

export class TextLoader extends DataLoader {
  private delimiter: string

  constructor (delimiter: string) {
    super()
    this.delimiter = delimiter
  }

  load (sources: Array<string>): tf.data.CSVDataset {
    const csvConfig = { delimiter: this.delimiter, columnConfigs: {} }
    const datasets: tf.data.CSVDataset[] = _.map(sources, source => tf.data.csv(source, csvConfig))
    return _.reduce(datasets, (prev, curr) => prev.concatenate(curr) as tf.data.CSVDataset)
  }
}
