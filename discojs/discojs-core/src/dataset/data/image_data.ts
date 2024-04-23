import type tf from '@tensorflow/tfjs'

import type { Task } from '../../index.js'
import type { Dataset } from '../dataset.js'

import { Data } from './data.js'
import { ImagePreprocessing, IMAGE_PREPROCESSING } from './preprocessing/index.js'

/**
 * Disco data made of image samples (.jpg, .png, etc.).
 */
export class ImageData extends Data {
  public readonly availablePreprocessing = IMAGE_PREPROCESSING

  static async init (
    dataset: Dataset,
    task: Task,
    size?: number
  ): Promise<Data> {
    // Here we do our best to check data format before proceeding to training, for
    // better error handling. An incorrectly formatted image in the dataset might still
    // cause an error during training, because of the lazy aspect of the dataset; we only
    // verify the first sample.
    if (task.trainingInformation.preprocessingFunctions?.includes(ImagePreprocessing.Resize) !== true) {
      try {
        const sample = (await dataset.take(1).toArray())[0]
        // TODO: We suppose the presence of labels
        // TODO: Typing (discojs-node/src/dataset/data_loader/image_loader.spec.ts)
        if (!(typeof sample === 'object' && sample !== null)) {
          throw new Error()
        }

        let shape
        if ('xs' in sample && 'ys' in sample) {
          shape = (sample as { xs: tf.Tensor, ys: number[] }).xs.shape
        } else {
          shape = (sample as tf.Tensor3D).shape
        }
        if (!(
          shape[0] === task.trainingInformation.IMAGE_W &&
          shape[1] === task.trainingInformation.IMAGE_H
        )) {
          throw new Error()
        }
      } catch (e) {
	      let cause
	      if (e instanceof Error) {
          cause = e
	      } else {
          console.error("got invalid Error type", e)
	      }
        throw new Error('Data input format is not compatible with the chosen task', { cause })
      }
    }

    return new ImageData(dataset, task, size)
  }

  protected create (dataset: Dataset, task: Task, size: number): ImageData {
    return new ImageData(dataset, task, size)
  }
}
