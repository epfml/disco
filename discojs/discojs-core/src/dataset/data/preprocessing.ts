import { tf, Task } from '../..'

type PreprocessImage = (image: tf.TensorContainer) => tf.TensorContainer
type PreprocessText = (text: tf.TensorContainer) => tf.TensorContainer

export type Preprocessing = ImagePreprocessing

export interface ImageTensorContainer extends tf.TensorContainerObject {
  xs: tf.Tensor3D | tf.Tensor4D
  ys: tf.Tensor1D | number | undefined
}

export interface TextTensorContainer extends tf.TensorContainerObject {
  xs: tf.tensor2D | tf.Tensor3D | tf.Tensor4D
  ys: tf.Tensor1D | number | undefined

}

export enum ImagePreprocessing {
  Normalize = 'normalize',
  Resize = 'resize'
}

export enum TextPreprocessing {
  Tokenize = 'tokenize'
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

export function getPreprocessText (task: Task): PreprocessText {
  const preprocessText: PreprocessText = (tensorContainer: tf.TensorContainer): tf.TensorContainer => {
    // TODO unsafe cast, tfjs does not provide the right interface
    const info = task.trainingInformation
    let { xs, ys } = tensorContainer as TextTensorContainer
    if (info.preprocessingFunctions?.includes(TextPreprocessing.Tokenize)) {
      const wordToIndex: { [key: string]: number } = {}
      let currentIndex = 0
      const words = xs.map(x => x.split(' '))
      const tokenizedText = words.map(word => {
        if (!wordToIndex[word]) {
          wordToIndex[word] = currentIndex
          currentIndex++
        }
        return wordToIndex[word]
      })
      xs = tf.tensor2d([tokenizedText], [1, tokenizedText.length])
    }
    return {
      xs,
      ys
    }
  }
  return preprocessText
}
