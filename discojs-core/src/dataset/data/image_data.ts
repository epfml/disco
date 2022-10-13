import { tf, Task } from '../..'
import { getPreprocessImage } from './preprocessing'
import { Dataset } from '../dataset'
import { Data } from './data'

export class ImageData extends Data {
  static async init (
    dataset: Dataset,
    task: Task,
    size?: number
  ): Promise<Data> {
    // Here we do our best to check data format before proceeding to training, for
    // better error handling. An incorrectly formatted image in the dataset might still
    // cause an error during training, because of the lazy aspect of the dataset; we only
    // verify the first sample.
    try {
      const sample = (await dataset.take(1).toArray())[0]
      // TODO: We suppose the presence of labels
      // TODO: Typing (discojs-node/src/dataset/data_loader/image_loader.spec.ts)
      if (!(typeof sample === 'object' && 'xs' in sample && 'ys' in sample)) {
        throw new Error()
      }
      const shape = (sample as { xs: tf.Tensor, ys: number[] }).xs.shape
      if (!(
        shape[0] === task.trainingInformation?.IMAGE_W &&
        shape[1] === task.trainingInformation?.IMAGE_H
      )) {
        throw new Error()
      }
    } catch (e) {
      throw new Error('Data input format is not compatible with the chosen task')
    }

    return new ImageData(dataset, task, size)
  }

  batch (): Data {
    const batchSize = this.task.trainingInformation.batchSize
    const newDataset = batchSize === undefined ? this.dataset : this.dataset.batch(batchSize)

    return new ImageData(newDataset, this.task, this.size)
  }

  preprocess (): Data {
    let newDataset = this.dataset
    const preprocessImage = getPreprocessImage(this.task)
    newDataset = newDataset.map((x: tf.TensorContainer) => preprocessImage(x))
    return new ImageData(newDataset, this.task, this.size)
  }
}
