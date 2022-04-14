import { Dataset } from '../dataset_builder'
import { DataLoader, Source, DataConfig, Data } from './data_loader'
import * as tf from '@tensorflow/tfjs'
import fs from 'fs'

/**
 * TODO @s314cy:
 * Load labels and correctly match them with their respective images, with the following constraints:
 * 1. Images are given as 1 image/1 file
 * 2. Labels are given as multiple labels/1 file, each label file can contain a different amount of labels
 */

export class ImageLoader extends DataLoader {
  async load (image: Source, config?: DataConfig): Promise<Dataset> {
    let tensorContainer: tf.TensorContainer
    if (config === undefined || config.labels === undefined) {
      tensorContainer = await ImageLoader.readImageFrom(image)
    } else {
      tensorContainer = {
        xs: await ImageLoader.readImageFrom(image),
        ys: config.labels[0]
      }
    }
    return tf.data.array([tensorContainer])
  }

  async loadAll (images: Source[], config?: DataConfig): Promise<Data> {
    const withLabels = config !== undefined && config.labels !== undefined
    let labels: any
    if (withLabels) {
      const numberOfClasses = this.task.trainingInformation.LABEL_LIST.length
      labels = tf.oneHot(tf.tensor1d(config.labels, 'int32'), numberOfClasses).arraySync()
    }
    const dataset = tf.data.generator(() => {
      let index = 0
      const iterator = {
        next: async () => {
          let sample: tf.Tensor
          let label: tf.Tensor
          if (index < images.length) {
            sample = await ImageLoader.readImageFrom(images[index])
            if (withLabels) {
              label = labels[index]
            }
            index++
            return {
              value: withLabels ? { xs: sample, ys: label } : sample,
              done: false
            }
          }
          return {
            value: withLabels ? { xs: sample, ys: label } : sample,
            done: true
          }
        }
      }
      return iterator as any // Lazy
    })

    return {
      dataset: dataset,
      size: images.length
    }
  }

  private static async readImageFrom (source: Source): Promise<tf.Tensor3D> {
    if (typeof source === 'string') {
      // Node environment
      const tfNode = require('@tensorflow/tfjs-node')
      const image = tfNode.node.decodeImage(fs.readFileSync(source))
      return image
    } else if (source instanceof File) {
      // Browser environment
      return tf.browser.fromPixels(await createImageBitmap(source))
    } else {
      throw new Error('not implemented')
    }
  }
}
