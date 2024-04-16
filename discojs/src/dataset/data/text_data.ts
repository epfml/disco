import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../index.js'

import { Data } from './data.js'
import { TEXT_PREPROCESSING } from './preprocessing/index.js'

/**
 * Disco data made of textual samples.
 */
export class TextData extends Data {
  public readonly availablePreprocessing = TEXT_PREPROCESSING

  static init (
    dataset: tf.data.Dataset<tf.TensorContainer>,
    task: Task,
    size?: number
  ): Promise<TextData> {
    return Promise.resolve(new TextData(dataset, task, size))
  }

  protected create (dataset: tf.data.Dataset<tf.TensorContainer>, task: Task, size?: number): TextData {
    return new TextData(dataset, task, size)
  }
}
