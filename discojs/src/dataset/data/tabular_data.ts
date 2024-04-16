import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../index.js'

import { Data } from './data.js'
import { TABULAR_PREPROCESSING } from './preprocessing/index.js'

/**
 * Disco data made of tabular (.csv, .tsv, etc.) files.
 */
export class TabularData extends Data {
  public readonly availablePreprocessing = TABULAR_PREPROCESSING

  static async init (
    dataset: tf.data.Dataset<tf.TensorContainer>,
    task: Task,
    size?: number
  ): Promise<TabularData> {
    // Force the check of the data column format (among other things) before proceeding
    // to training, for better error handling. An incorrectly formatted line might still
    // cause an error during training, because of the lazy aspect of the dataset; we only
    // load/read the tabular file's lines on training.
    try {
      await dataset.iterator()
    } catch (e) {
      console.error('Data input format is not compatible with the chosen task.')
      throw (e)
    }

    return new TabularData(dataset, task, size)
  }

  protected create (dataset: tf.data.Dataset<tf.TensorContainer>, task: Task, size: number): TabularData {
    return new TabularData(dataset, task, size)
  }
}
