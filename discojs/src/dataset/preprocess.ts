import * as tf from '@tensorflow/tfjs'
import { TrainingInformation } from '../task/training_information'

export type PreprocessImage = (image: tf.Tensor3D) => tf.Tensor3D

export enum Preprocess {
  Normalize = 'normalize',
  Resize = 'resize'
}

export function getPreprocessImage (info: TrainingInformation): PreprocessImage {
  const preprocessImage: PreprocessImage = (image: tf.Tensor3D): tf.Tensor3D => {
    if (info.preprocessFunctions.includes(Preprocess.Normalize)) {
      image = image.div(tf.scalar(255))
    }
    if (info.preprocessFunctions.includes(Preprocess.Resize) &&
      info.RESIZED_IMAGE_H !== undefined &&
      info.RESIZED_IMAGE_W !== undefined) {
      image = tf.image.resizeBilinear(image, [
        info.RESIZED_IMAGE_H, info.RESIZED_IMAGE_W
      ])
    }
    return image
  }
  return preprocessImage
}
