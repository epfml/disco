import * as tf from '@tensorflow/tfjs'
import type { List } from 'immutable'

import type { Task } from '../../index.js'

import type { PreprocessingFunction } from './preprocessing/base.js'

/**
 * Abstract class representing an immutable Disco dataset, including a TF.js dataset,
 * Disco task and set of preprocessing functions.
 */
export abstract class Data {
  public abstract readonly availablePreprocessing: List<PreprocessingFunction>

  protected constructor (
    public readonly dataset: tf.data.Dataset<tf.TensorContainer>,
    public readonly task: Task,
    public readonly size?: number) {}

  static init (
    _dataset: tf.data.Dataset<tf.TensorContainer>,
    _task: Task,
    _size?: number
  ): Promise<Data> {
    return Promise.reject(new Error('abstract'))
  }

  /**
   * Callable abstract method instead of constructor.
   */
  protected abstract create (dataset: tf.data.Dataset<tf.TensorContainer>, task: Task, size?: number): Data

  /**
   * Creates a new Disco data object containing the batched TF.js dataset, according to the
   * task's parameters.
   * @returns The batched Disco data
   */
  batch (): Data {
    return this.create(this.batchedDataset, this.task, this.size)
  }

  /**
   * The TF.js dataset batched according to the task's parameters.
   */
  get batchedDataset (): tf.data.Dataset<tf.TensorContainer> {
    const batchSize = this.task.trainingInformation.batchSize
    return batchSize === undefined
      ? this.dataset
      : this.dataset.batch(batchSize)
  }

  /**
   * Creates a new Disco data object containing the preprocessed TF.js dataset,
   * according to the defined set of preprocessing functions and the task's parameters.
   * @returns The preprocessed Disco data
   */
  preprocess (): Data {
    return this.create(this.preprocessedDataset, this.task, this.size)
  }

  /**
   * Creates a higher level preprocessing function applying the specified set of preprocessing
   * functions in a series. The preprocessing functions are chained according to their defined
   * priority.
   */
  get preprocessing (): (entry: tf.TensorContainer) => Promise<tf.TensorContainer> {
    const params = this.task.trainingInformation
    const taskPreprocessing = params.preprocessingFunctions
    if (
      taskPreprocessing === undefined ||
      taskPreprocessing.length === 0 ||
      this.availablePreprocessing === undefined ||
      this.availablePreprocessing.size === 0
      ) {
        return x => Promise.resolve(x)
      }
    
    const applyPreprocessing = this.availablePreprocessing
    .filter((e) => e.type in taskPreprocessing)
    .map((e) => e.apply)

    const preprocessingChain = async (input: Promise<tf.TensorContainer>) => {
      let currentContainer = await input;  // Start with the initial tensor container
      for (const fn of applyPreprocessing) {
          const next = await fn(Promise.resolve(currentContainer), this.task);

          // dirty but kinda working way to dispose of converted tensors
          if (typeof currentContainer === "object" && typeof next === "object") {
            if (
              "xs" in currentContainer &&
              "xs" in next &&
              currentContainer.xs !== next.xs
            )
              tf.dispose(currentContainer.xs);
            if (
              "ys" in currentContainer &&
              "ys" in next &&
              currentContainer.ys !== next.ys
            )
              tf.dispose(currentContainer.ys);
          }

          currentContainer = next
      }

      return currentContainer; // Return the final tensor container
    };
  
    return async (entry) =>  await preprocessingChain(Promise.resolve(entry));
  }

  /**
   * The TF.js dataset preprocessing according to the set of preprocessing functions and the task's
   * parameters.
   */
  get preprocessedDataset (): tf.data.Dataset<tf.TensorContainer> {
    return this.dataset.mapAsync(this.preprocessing)
  }
}
