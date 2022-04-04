import { DataLoader, Source } from './data_loader'
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
   * @param sources List of File objects, URLs or file system paths.
   * @param features List of feature column names.
   * @param labels Label column name.
   * @returns A TF.js dataset built upon read tabular data stored in the given sources.
   */
  load (sources: Source[], features: string[], labels: string[]): tf.data.CSVDataset {
    /**
     * Prepare the CSV config object based off the given features and labels.
     * If labels is empty, then the returned dataset is comprised of samples only.
     * Otherwise, each entry is of the form `{ xs, ys }` with `xs` as features and `ys`
     * as labels.
     */
    const columnConfigs = {}
    _.forEach(labels, (label) => {
      columnConfigs[label] = { required: true, isLabel: true }
    })
    _.forEach(features, (feature) => {
      columnConfigs[feature] = { required: false, isLabel: false }
    })
    const csvConfig = {
      hasHeader: true,
      columnConfigs: columnConfigs,
      configuredColumnsOnly: true,
      delimiter: this.delimiter
    }

    /**
     * Create the CSV datasets based off the given sources, then fuse them into a single CSV
     * dataset.
     */
    const datasets = _.map(sources, source => this.readTabularDatasetFrom(source, csvConfig))
    const dataset = _.reduce(datasets, (prev, curr) => prev.concatenate(curr) as tf.data.CSVDataset)
    return dataset
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
  private readTabularDatasetFrom (source: Source, csvConfig: any): tf.data.CSVDataset {
    if (typeof source === 'string') {
      return tf.data.csv(source, csvConfig)
    } else if (source instanceof File) {
      return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
    } else {
      throw new Error('not implemented')
    }
  }
}
