import { List, Map, Set } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../index.js'

import type { DataSplit } from '../index.js'
import { TabularData } from '../index.js'

import type { DataConfig } from './index.js'
import { DataLoader } from './index.js'

// Window size from which the dataset shuffling will sample
const BUFFER_SIZE = 1000

/**
 * Tabular data loader whose instantiable implementation is delegated by the platform-dependent Disco subprojects, namely,
 * @epfml/discojs-web and @epfml/discojs-node. Loads data from files whose entries are line-separated and consist of
 * character-separated features and label(s). Such files typically have the .csv extension.
 */
export abstract class TabularLoader<Source> extends DataLoader<Source> {
  constructor (
    private readonly task: Task,
    public readonly delimiter = ','
  ) {
    super()
  }

  /**
   * Creates a CSV dataset object based off the given source.
   * @param source File object, URL string or local file system path.
   * @param csvConfig Object expected by TF.js to create a CSVDataset.
   * @returns The CSVDataset object built upon the given source.
   */
  abstract loadDatasetFrom (source: Source, csvConfig: Record<string, unknown>): Promise<tf.data.Dataset<tf.TensorContainer>>

  /**
   * Expects delimiter-separated tabular data made of N columns. The data may be
   * potentially split among several sources. Every source should contain N-1
   * feature columns and 1 single label column.
   * @param source List of File objects, URLs or file system paths.
   * @param config
   * @returns A TF.js dataset built upon read tabular data stored in the given sources.
   */
  async load (source: Source, config?: DataConfig): Promise<tf.data.Dataset<tf.TensorContainer>> {
    /**
     * Prepare the CSV config object based off the given features and labels.
     * If labels is empty, then the returned dataset is comprised of samples only.
     * Otherwise, each entry is of the form `{ xs, ys }` with `xs` as features and `ys`
     * as labels.
     */
    if (config?.features === undefined) {
      // TODO @s314cy
      throw new Error('Not implemented')
    }
    const columnConfigs = Map(
      Set(config.features).map((feature) => [feature, { required: false, isLabel: false }])
    ).merge(
      Set(config.labels).map((label) => [label, { required: true, isLabel: true }])
    )

    const csvConfig = {
      hasHeader: true,
      columnConfigs: columnConfigs.toObject(),
      configuredColumnsOnly: true,
      delimiter: this.delimiter
    }

    const dataset = (await this.loadDatasetFrom(source, csvConfig)).map((t) => {
      if (typeof t === 'object') {
        if (('xs' in t) && ('ys' in t)) {
          const { xs, ys } = t as Record<string, Record<string, number>>
          return {
            xs: Object.values(xs),
            ys: Object.values(ys)
          }
        } else {
          return t
        }
      }
      throw new TypeError('Expected TensorContainerObject')
    })
    return (config?.shuffle === undefined || config?.shuffle) ? dataset.shuffle(BUFFER_SIZE) : dataset
  }

  /**
   * Creates the CSV datasets based off the given sources, then fuses them into a single CSV
   * dataset.
   */
  async loadAll (sources: Source[], config: DataConfig): Promise<DataSplit> {
    const datasets = await Promise.all(sources.map(async (source) =>
      await this.load(source, { ...config, shuffle: false })))
    let dataset = List(datasets).reduce((acc: tf.data.Dataset<tf.TensorContainer>, dataset) => acc.concatenate(dataset))
    dataset = config?.shuffle === true ? dataset.shuffle(BUFFER_SIZE) : dataset
    const data = await TabularData.init(dataset, this.task)
    // TODO: Implement validation split for tabular data (tricky due to streaming)
    return {
      train: data
    }
  }
}
