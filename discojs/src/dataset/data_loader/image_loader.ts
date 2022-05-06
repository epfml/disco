import * as tf from '@tensorflow/tfjs'

import { Dataset } from '../dataset_builder'
import { DataLoader, DataConfig, Data } from './data_loader'

/**
 * TODO @s314cy:
 * Load labels and correctly match them with their respective images, with the following constraints:
 * 1. Images are given as 1 image/1 file
 * 2. Labels are given as multiple labels/1 file, each label file can contain a different amount of labels
 */

export abstract class ImageLoader<Source> extends DataLoader<Source> {
  abstract readImageFrom (source: Source): Promise<tf.Tensor3D>

  async load (image: Source, config?: DataConfig): Promise<Dataset> {
    let tensorContainer: tf.TensorContainer
    if (config === undefined || config.labels === undefined) {
      tensorContainer = await this.readImageFrom(image)
    } else {
      tensorContainer = {
        xs: await this.readImageFrom(image),
        ys: config.labels[0]
      }
    }
    return tf.data.array([tensorContainer])
  }

  async loadAll (images: Source[], config?: DataConfig): Promise<Data> {
    let labels: number[]
    if (config?.labels !== undefined) {
      const numberOfClasses = this.task.trainingInformation?.LABEL_LIST?.length
      if (numberOfClasses === undefined) {
        throw new Error('wanted labels but none found in task')
      }

      labels = tf.oneHot(tf.tensor1d(config.labels, 'int32'), numberOfClasses).arraySync() as number[]
    }

    const dataset = tf.data.generator(() => {
      const withLabels = config?.labels !== undefined

      let index = 0
      const iterator = {
        next: async () => {
          if (index === images.length) {
            return { done: true }
          }

          const sample = await this.readImageFrom(images[index])
          const label = withLabels ? labels[index] : undefined
          const value = withLabels ? { xs: sample, ys: label } : sample

          index++

          return {
            value,
            done: false
          }
        }
      }
      return iterator as unknown as Iterator<tf.Tensor> // Lazy
    })

    return {
      dataset: dataset,
      size: images.length
    }
  }
}
