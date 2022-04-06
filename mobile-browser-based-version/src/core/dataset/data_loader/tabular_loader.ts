import { DataLoader, Source, DataConfig } from './data_loader'
import * as tf from '@tensorflow/tfjs'
import _ from 'lodash'

export class TabularLoader extends DataLoader {
  private delimiter: string

  constructor (delimiter: string) {
    super()
    this.delimiter = delimiter
  }

  /**
   * Expects delimiter-separated tabular data made of N columns. The data may be
   * potentially split among several sources. Every source should contain N-1
   * feature columns and 1 single label column.
   * @param source List of File objects, URLs or file system paths.
   * @param config
   * @returns A TF.js dataset built upon read tabular data stored in the given sources.
   */
  load (source: Source, config: DataConfig): tf.data.CSVDataset {
    /**
     * Prepare the CSV config object based off the given features and labels.
     * If labels is empty, then the returned dataset is comprised of samples only.
     * Otherwise, each entry is of the form `{ xs, ys }` with `xs` as features and `ys`
     * as labels.
     */
    const columnConfigs = {}
    _.forEach(config.features, (feature) => {
      columnConfigs[feature] = { required: false, isLabel: false }
    })
    if (config.labels !== undefined) {
      _.forEach(config.labels, (label) => {
        columnConfigs[label] = { required: true, isLabel: true }
      })
    }

    const csvConfig = {
      hasHeader: true,
      columnConfigs: columnConfigs,
      configuredColumnsOnly: true,
      delimiter: this.delimiter
    }
    return TabularLoader.loadTabularDatasetFrom(source, csvConfig)
  }

  /**
    * Creates the CSV datasets based off the given sources, then fuses them into a single CSV
    * dataset.
    */
  loadAll (sources: Source[], config: DataConfig): tf.data.CSVDataset {
    const datasets = _.map(sources, (source) => this.load(source, config))
    return _.reduce(datasets, (prev, curr) => prev.concatenate(curr) as tf.data.CSVDataset)
  }

  /**
   * Creates a CSV dataset object based off the given source. If the source is a string,
   * uses the available tf.data.csv function handling URLs and file system paths. If the
   * source is instead a File object, manually creates the dataset with the help of the
   * tf.data.FileDataSource class. The latter is undocumented but mimics tf.data.csv.
   * @param source File object, URL string or local file system path.
   * @param csvConfig Object expected by TF.js to create a CSVDataset.
   * @returns The CSVDataset object built upon the given source.
   */
  static loadTabularDatasetFrom (source: Source, csvConfig: any): tf.data.CSVDataset {
    if (typeof source === 'string') {
      // Node environment
      return tf.data.csv(source, csvConfig)
    } else if (source instanceof File) {
      // Browser environment
      return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
    } else {
      throw new Error('not implemented')
    }
  }
}
