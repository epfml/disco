import { tf, Task } from '../..'

type PreprocessImage = (image: tf.TensorContainer) => tf.TensorContainer

export type Preprocessing = ImagePreprocessing

export interface ImageTensorContainer extends tf.TensorContainerObject {
  xs: tf.Tensor3D | tf.Tensor4D
  ys: tf.Tensor1D | number | undefined
}

export enum ImagePreprocessing {
  Normalize = 'normalize',
  Resize = 'resize'
}

export function getPreprocessImage (task: Task): PreprocessImage {
  const preprocessImage: PreprocessImage = (tensorContainer: tf.TensorContainer): tf.TensorContainer => {
    // TODO unsafe cast, tfjs does not provide the right interface
    const info = task.trainingInformation
    let { xs, ys } = tensorContainer as ImageTensorContainer
    if (info.preprocessingFunctions?.includes(ImagePreprocessing.Normalize)) {
      xs = xs.div(tf.scalar(255))
    }
    if (info.preprocessingFunctions?.includes(ImagePreprocessing.Resize) &&
      info.IMAGE_H !== undefined &&
      info.IMAGE_W !== undefined) {
      xs = tf.image.resizeBilinear(xs, [
        info.IMAGE_H, info.IMAGE_W
      ])
    }
    return {
      xs,
      ys
    }
  }
  return preprocessImage
}
