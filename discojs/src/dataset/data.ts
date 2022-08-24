import { Dataset } from './dataset_builder'
import { DataType } from '../task/training_information'
import { getPreprocessImage } from './preprocessing'
import { Task } from '../task/task'

import * as tf from '@tensorflow/tfjs'

export interface DataTuple {
  train: Data
  validation?: Data
}

export abstract class Data {
  readonly dataset: Dataset
  protected readonly task: Task
  readonly size?: number

  constructor (dataset: Dataset, task: Task, size?: number) {
    this.dataset = dataset
    this.task = task
    this.size = size
  }

  abstract batch (): Data

  abstract preprocess (): Data
}

export class ImageData extends Data {
  batch (): Data {
    const batchSize = this.task.trainingInformation.batchSize
    const newDataset = this.dataset.batch(batchSize)

    return new ImageData(newDataset, this.task, this.size)
  }

  preprocess (): Data {
    switch (this.task.dataInformation.type) {
      case DataType.IMAGE: {
        const preprocessImage = getPreprocessImage(this.task.dataInformation)
        const newDataset = this.dataset.map((x: tf.TensorContainer) => preprocessImage(x))
        return new ImageData(newDataset, this.task, this.size)
      }
      case DataType.TABULAR: { return this }
    }
  }
}

export class TabularData extends Data {
  batch (): Data {
    const batchSize = this.task.trainingInformation.batchSize
    const newDataset = this.dataset.batch(batchSize)

    return new TabularData(newDataset, this.task, this.size)
  }

  preprocess (): Data {
    return this
  }
}
