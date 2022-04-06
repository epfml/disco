import { Dataset } from '../dataset_builder'
import { DataLoader, Source, DataConfig } from './data_loader'
import * as tf from '@tensorflow/tfjs'
import fs from 'fs'

/**
 * TODO @s314cy:
 * Load labels and correctly match them with their respective images, with the following constraints:
 * 1. Images are given as 1 image/1 file
 * 2. Labels are given as multiple labels/1 file, each label file can contain a different amount of labels
 */

export class ImageLoader extends DataLoader {
  load (image: Source, config: DataConfig): Dataset {
    let tensorContainer: tf.TensorContainer
    if (config.labels === undefined) {
      tensorContainer = ImageLoader.readImageFrom(image)
    } else {
      tensorContainer = {
        xs: [ImageLoader.readImageFrom(image)],
        ys: [config.labels[0]]
      }
    }
    return tf.data.array([tensorContainer])
  }

  loadAll (images: Source[], config: DataConfig): Dataset {
    if (config.labels === undefined) {
      return tf.data.generator(() => {
        let index = 0
        const iterator = {
          next: () => {
            return {
              value: ImageLoader.readImageFrom(images[index++]),
              done: index >= images.length - 1
            }
          }
        }
        return iterator
      })
    } else {
      return tf.data.generator(() => {
        let index = 0
        const iterator = {
          next: () => {
            return {
              value: { xs: '', ys: '' },
              done: index++ >= images.length - 1
            }
          }
        }
        return iterator
      })
    }
  }

  private static readImageFrom (image: Source): tf.Tensor {
    if (typeof image === 'string') {
      // Node environment
      const tfNode = require('@tensorflow/tfjs-node')
      return tfNode.node.decodeImage(fs.readFileSync(image))
    } else if (image instanceof File) {
      // TODO: Browser environment
      return tf.tensor([1]) // tf.browser.fromPixels(image)
    } else {
      throw new Error('not implemented')
    }
  }
}
