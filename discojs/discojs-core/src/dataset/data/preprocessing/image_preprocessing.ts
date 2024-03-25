import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { PreprocessingFunction } from './base.js'

/**
 * Available image preprocessing types.
 */
export enum ImagePreprocessing {
  Resize,
  Normalize
}

interface ImageEntry extends tf.TensorContainerObject {
  xs: tf.Tensor3D | tf.Tensor4D
  ys: tf.Tensor1D | number | undefined
}

const resize: PreprocessingFunction = {
  type: ImagePreprocessing.Resize,
  apply: (entry: tf.TensorContainer, task: Task): tf.TensorContainer => {
    const { xs, ys } = entry as ImageEntry
    const params = task.trainingInformation
    return {
      xs: params.IMAGE_W !== undefined && params.IMAGE_H !== undefined
        ? xs.resizeBilinear([params.IMAGE_H, params.IMAGE_W])
        : xs,
      ys
    }
  }
}

const normalize: PreprocessingFunction = {
  type: ImagePreprocessing.Normalize,
  apply: (entry: tf.TensorContainer): tf.TensorContainer => {
    const { xs, ys } = entry as ImageEntry
    return {
      xs: xs.div(tf.scalar(255)),
      ys
    }
  }
}

/**
 * Available image preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List([
  resize,
  normalize]
).sortBy((e) => e.type)
