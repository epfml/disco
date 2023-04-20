import { tf, Task } from '../..'
import { Dataset } from '../dataset'
import { PreprocessingFunction } from './preprocessing/base'

import { List } from 'immutable'

export abstract class Data {
  public abstract readonly availablePreprocessing: List<PreprocessingFunction>

  protected constructor (
    public readonly dataset: Dataset,
    public readonly task: Task,
    public readonly size?: number) {}

  static async init (
    dataset: Dataset,
    task: Task,
    size?: number
  ): Promise<Data> {
    throw new Error('abstract')
  }

  // Callable abstract method instead of constructor
  protected abstract create (dataset: Dataset, task: Task, size?: number): Data

  batch (): Data {
    return this.create(this.batchedDataset, this.task, this.size)
  }

  get batchedDataset (): Dataset {
    const batchSize = this.task.trainingInformation.batchSize
    return batchSize === undefined
      ? this.dataset
      : this.dataset.batch(batchSize)
  }

  preprocess (): Data {
    return this.create(this.preprocessedDataset, this.task, this.size)
  }

  get preprocessing (): (entry: tf.TensorContainer) => tf.TensorContainer {
    const params = this.task.trainingInformation
    const taskPreprocessing = params.preprocessingFunctions

    if (
      taskPreprocessing === undefined ||
      taskPreprocessing.length === 0 ||
      this.availablePreprocessing.size === 0
    ) {
      return (x) => x
    }

    const applyPreprocessing = this.availablePreprocessing
      .filter((e) => e.type in taskPreprocessing)
      .map((e) => e.apply)

    if (applyPreprocessing.size === 0) {
      return (x) => x
    }

    const preprocessingChain = applyPreprocessing
      .reduce((acc: (x: tf.TensorContainer, task: Task) => tf.TensorContainer, fn) =>
        (x: tf.TensorContainer, task: Task) => fn(acc(x, this.task), this.task))

    return (x: tf.TensorContainer) => preprocessingChain(x, this.task)
  }

  get preprocessedDataset (): Dataset {
    return this.dataset.map(this.preprocessing)
  }
}
