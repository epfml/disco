import type { Task } from '../../index.js'
import type { Dataset } from '../dataset.js'

import { Data } from './data.js'
import { TEXT_PREPROCESSING } from './preprocessing/index.js'

/**
 * Disco data made of textual samples.
 */
export class TextData extends Data {
  public readonly availablePreprocessing = TEXT_PREPROCESSING

  static async init (
    dataset: Dataset,
    task: Task,
    size?: number
  ): Promise<TextData> {
    return new TextData(dataset, task, size)
  }

  protected create (dataset: Dataset, task: Task, size?: number): TextData {
    return new TextData(dataset, task, size)
  }
}
