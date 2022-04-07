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
  load (image: Source, config?: DataConfig): Dataset {
    let tensorContainer: tf.TensorContainer
    if (config === undefined || config.labels === undefined) {
      tensorContainer = ImageLoader.readImageFrom(image)
    } else {
      tensorContainer = {
        xs: [ImageLoader.readImageFrom(image)],
        ys: [config.labels[0]]
      }
    }
    return tf.data.array([tensorContainer])
  }

  loadAll (images: Source[], config?: DataConfig): Dataset {
    const withLabels = config !== undefined && config.labels !== undefined
    return tf.data.generator(() => {
      let index = 0
      const iterator = {
        next: () => {
          let sample: tf.Tensor3D
          let label: string
          if (index < images.length) {
            sample = ImageLoader.readImageFrom(images[index])
            if (withLabels) {
              label = config.labels[index]
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
      return iterator
    })
  }

  private static readImageFrom (source: Source): tf.Tensor3D {
    if (typeof source === 'string') {
      // Node environment
      const tfNode = require('@tensorflow/tfjs-node')
      return tfNode.node.decodeImage(fs.readFileSync(source))
    } else if (source instanceof File) {
      // TODO: Browser environment
      return tf.tensor([1]) // tf.browser.fromPixels(image)
    } else {
      throw new Error('not implemented')
    }
  }
}
