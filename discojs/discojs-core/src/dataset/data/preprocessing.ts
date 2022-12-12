import { tf, Task } from '../..'
import { Dataset } from '../dataset'

type PreprocessImage = (image: tf.TensorContainer) => tf.TensorContainer
type PreprocessTabular = (dataset: Dataset) => Promise<Dataset>

export type Preprocessing = ImagePreprocessing | TabularPreprocessing

export interface TabularTensorContainer extends tf.TensorContainerObject {
  xs: number[]
  ys: tf.Tensor1D | number | undefined
}

export interface ImageTensorContainer extends tf.TensorContainerObject {
  xs: tf.Tensor3D | tf.Tensor4D
  ys: tf.Tensor1D | number | undefined
}

export enum ImagePreprocessing {
  Normalize = 'normalize',
  Resize = 'resize',
}

export enum TabularPreprocessing {
  Normalize = 'normalize',
}

export function getPreprocessImage (task: Task): PreprocessImage {
  const preprocessImage: PreprocessImage = (tensorContainer: tf.TensorContainer): tf.TensorContainer => {
    // TODO unsafe cast, tfjs does not provide the right interface
    const info = task.trainingInformation
    let { xs, ys } = tensorContainer as ImageTensorContainer
    if (info.preprocessingFunctions?.includes(ImagePreprocessing.Normalize)) {
      xs = xs.div(tf.scalar(255))
    } else if (info.preprocessingFunctions?.includes(ImagePreprocessing.Resize) &&
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

export function getPreprocessTabular (task: Task): PreprocessTabular {
  const preprocessTabular: PreprocessTabular = async (dataset: Dataset): Promise<Dataset> => {
    // Dropping rows with null values
    dataset = dataset.filter(row => (row as TabularTensorContainer).xs.every(el => el !== undefined))

    const info = task.trainingInformation
    if (info.preprocessingFunctions?.includes(TabularPreprocessing.Normalize)) {
      // Creating a 2D tensor to compute mean and std on the whole dataset
      const datasetAsArray = await dataset.map(row => (row as TabularTensorContainer).xs).toArray()
      const datasetTensor2D = tf.tensor2d(datasetAsArray)

      const dataMean = datasetTensor2D.mean(0).arraySync() as number[]
      const diffFromMean = datasetTensor2D.sub(dataMean)

      const squaredDiffFromMean = diffFromMean.square()
      const variance = squaredDiffFromMean.mean(0)
      const dataStd = variance.sqrt().arraySync() as number[]

      // Standardizing the dataset
      const newDataset = dataset.map(row => ({ xs: (row as TabularTensorContainer).xs.map((v, i) => (v - dataMean[i]) / dataStd[i]), ys: (row as TabularTensorContainer).ys }))
      return newDataset
    }

    return dataset
  }
  return preprocessTabular
}
