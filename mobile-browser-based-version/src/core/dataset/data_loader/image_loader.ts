import { DataLoader, Source } from './data_loader'
import { Dataset } from '../dataset_builder'
import * as tf from '@tensorflow/tfjs'
import fs from 'fs'

/**
 * TODO @s314cy:
 * Load labels and correctly match them with their respective images, with the following constraints:
 * 1. Images are given as 1 image/1 file
 * 2. Labels are given as multiple labels/1 file, each label file can contain a different amount of labels
 */

export class ImageLoader extends DataLoader {
  load (images: Source[], labels?: Source[]): Dataset {
    return tf.data.generator(() => {
      let index = 0
      const iterator = {
        next: () => {
          const image = images[index++]
          const label = labels[index]
          const done = index >= images.length
          return this.convertImageToTensor(image, label, done)
        }
      }
      return iterator
    })
  }

  private convertImageToTensor (image: Source, label: Source, done: boolean): { value: any, done: boolean } {
    if (image instanceof File && label instanceof File) {
      const imageContent = image.stream().read()
      const labelContent = label.stream().read()
      return { value: { xs: tf.tensor(imageContent), ys: labelContent }, done: done }
    } else if (typeof image === 'string' && typeof label === 'string') {
      const imageContent = fs.readFileSync(image)
      return { value: tf.tensor(imageContent), done: done }
    } else {
      throw new Error('not implemented')
    }
  }
}
