import { Task } from '../..'
import { getPreprocessTabular } from './preprocessing'
import { Dataset } from '../dataset'
import { Data } from './data'

export class TabularData extends Data {
  static async init (
    dataset: Dataset,
    task: Task,
    size?: number
  ): Promise<Data> {
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

  batch (): Data {
    const batchSize = this.task.trainingInformation.batchSize
    const newDataset = batchSize === undefined ? this.dataset : this.dataset.batch(batchSize)

    return new TabularData(newDataset, this.task, this.size)
  }

  async preprocess (): Promise<Data> {
    let newDataset = this.dataset
    const preprocessTabular = getPreprocessTabular(this.task)
    newDataset = await preprocessTabular(newDataset)
    return new TabularData(newDataset, this.task, this.size)
  }
}
