import { DataLoader } from './data_loader'
import * as tf from '@tensorflow/tfjs'
import _ from 'lodash'

export class TextLoader extends DataLoader {
  private delimiter: string

  constructor (delimiter: string) {
    super()
    this.delimiter = delimiter
  }

  /**
   * Expects delimiter-separated data made of N columns.
   * Every source should contain N-1 feature columns and 1 single label column.
   * @param sources List of URLs or file system paths.
   * @param features List of feature column names.
   * @param label Label column name.
   * @returns A TF.js dataset built upon read textual data stored in the given sources.
   */
  load (sources: Array<string>, features: Array<string>, label: string): tf.data.Dataset<tf.TensorContainer> {
    const csvConfig = {
      hasHeader: true,
      columnNames: features,
      columnsConfigs: {},
      delimiter: this.delimiter
    }
    csvConfig[label] = { isLabel: true }

    const datasets = _.map(sources, source => tf.data.csv(source, csvConfig))
    return _.reduce(datasets, (prev, curr) => prev.concatenate(curr))
  }
}
