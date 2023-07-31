import { Task } from '../..'
import { Dataset } from '../dataset'
import { Data } from './data'
import { TABULAR_PREPROCESSING } from './preprocessing'

export class TabularData extends Data {
  public readonly availablePreprocessing = TABULAR_PREPROCESSING

  static async init (
    dataset: Dataset,
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
      throw new Error('Data input format is not compatible with the chosen task')
    }

    return new TabularData(dataset, task, size)
  }

  protected create (dataset: Dataset, task: Task, size: number): TabularData {
    return new TabularData(dataset, task, size)
  }
}
