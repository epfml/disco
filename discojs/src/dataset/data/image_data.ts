import type tf from '@tensorflow/tfjs'

import type { Task } from '../../index.js'

import { Data } from './data.js'
import { ImagePreprocessing, IMAGE_PREPROCESSING } from './preprocessing/index.js'

/**
 * Disco data made of image samples (.jpg, .png, etc.).
 */
export class ImageData extends Data {
  public readonly availablePreprocessing = IMAGE_PREPROCESSING

  static async init (
    dataset: tf.data.Dataset<tf.TensorContainer>,
    task: Task,
    size?: number
  ): Promise<Data> {
    // Here we do our best to check data format before proceeding to training, for
    // better error handling. An incorrectly formatted image in the dataset might still
    // cause an error during training, because of the lazy aspect of the dataset; we only
    // verify the first sample.
    if (task.trainingInformation.preprocessingFunctions?.includes(ImagePreprocessing.Resize) !== true) {
      const sample = (await dataset.take(1).toArray())[0]
      // TODO: We suppose the presence of labels
      // TODO: Typing (discojs-node/src/dataset/data_loader/image_loader.spec.ts)
      if (typeof sample !== 'object' || sample === null  || sample === undefined) {
        throw new Error("Image is undefined or is not an object")
      }

      let shape
      if ('xs' in sample && 'ys' in sample) {
        shape = (sample as { xs: tf.Tensor, ys: number[] }).xs.shape
      } else {
        shape = (sample as tf.Tensor3D).shape
      }
      const {IMAGE_H, IMAGE_W} = task.trainingInformation
      if (IMAGE_W !== undefined && IMAGE_H !== undefined &&
        (shape[0] !== IMAGE_W || shape[1] !== IMAGE_H)) {
          throw new Error(`Image doesn't have the dimensions specified in the task's training information. Expected ${IMAGE_H}x${IMAGE_W} but got ${shape[0]}x${shape[1]}.`)
      }
    }
    return new ImageData(dataset, task, size)
  }

  protected create (dataset: tf.data.Dataset<tf.TensorContainer>, task: Task, size: number): ImageData {
    return new ImageData(dataset, task, size)
  }
}
