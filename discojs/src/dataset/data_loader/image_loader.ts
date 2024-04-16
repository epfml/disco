import { Range } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../index.js'

import type { Data, DataSplit } from '../index.js'
import { ImageData } from '../data/index.js'
import type { DataConfig } from '../data_loader/index.js'
import { DataLoader } from '../data_loader/index.js'

/**
 * Image data loader whose instantiable implementation is delegated by the platform-dependent Disco subprojects, namely,
 * @epfml/discojs-web and @epfml/discojs-node.
 * Load labels and correctly match them with their respective images, with the following constraints:
 * 1. Images are given as 1 image/1 file;
 * 2. Labels are given as multiple labels/1 file, each label file can contain a different amount of labels.
 */
export abstract class ImageLoader<Source> extends DataLoader<Source> {
  // We allow specifying the number of channels because the default number of channels
  // differs between web and node for the same image 
  // E.g. lus covid images have 1 channel with fs.readFile but 3 when loaded with discojs-web
  abstract readImageFrom (source: Source, channels?:number): Promise<tf.Tensor3D>

  constructor (
    private readonly task: Task
  ) {
    super()
  }

  async load (image: Source, config?: DataConfig): Promise<tf.data.Dataset<tf.TensorContainer>> {
    let tensorContainer: tf.TensorContainer
    if (config?.labels === undefined) {
      tensorContainer = await this.readImageFrom(image, config?.channels)
    } else {
      tensorContainer = {
        xs: await this.readImageFrom(image, config?.channels),
        ys: config.labels[0]
      }
    }
    return tf.data.array([tensorContainer])
  }

  private async buildDataset (images: Source[], labels: number[], indices: number[], config?: DataConfig): Promise<Data> {
    // Can't use arrow function for generator and need access to 'this'
    // eslint-disable-next-line
    const self = this
    async function * dataGenerator (): AsyncGenerator<tf.TensorContainer> {
      const withLabels = config?.labels !== undefined

      let index = 0
      while (index < indices.length) {
        const sample = await self.readImageFrom(images[indices[index]], config?.channels)
        const label = withLabels ? labels[indices[index]] : undefined
        const value = withLabels ? { xs: sample, ys: label } : sample

        index++
        yield value
      }
    }

    // @ts-expect-error: For some reasons typescript refuses async generator but tensorflow do work with them
    const dataset: tf.data.Dataset<tf.TensorContainer> = tf.data.generator(dataGenerator)

    return await ImageData.init(dataset, this.task, indices.length)
  }

  async loadAll (images: Source[], config?: DataConfig): Promise<DataSplit> {
    let labels: number[] = []

    const indices = Range(0, images.length).toArray()
    if (config?.labels !== undefined) {
      const labelList = this.task.trainingInformation?.LABEL_LIST
      if (labelList === undefined || !Array.isArray(labelList)) {
        throw new Error('LABEL_LIST should be specified in the task training information')
      }
      const numberOfClasses = labelList.length
      // Map label strings to integer
      const label_to_int = new Map(labelList.map((label_name, idx) => [label_name, idx]))
      if (label_to_int.size !== numberOfClasses) {
        throw new Error("Input labels aren't matching the task LABEL_LIST")
      }

      labels = config.labels.map(label_name => {
        const label_int = label_to_int.get(label_name)
        if (label_int === undefined) {
          throw new Error(`Found input label ${label_name} not specified in task LABEL_LIST`)
        }
        return label_int
      })

      labels = await tf.oneHot(tf.tensor1d(labels, 'int32'), numberOfClasses).array() as number[]
    }
    if (config?.shuffle === undefined || config?.shuffle) {
      this.shuffle(indices)
    }

    if (config?.validationSplit === undefined || config?.validationSplit === 0) {
      const dataset = await this.buildDataset(images, labels, indices, config)
      return {
        train: dataset,
        validation: undefined
      }
    }

    const trainSize = Math.floor(images.length * (1 - config.validationSplit))

    const trainIndices = indices.slice(0, trainSize)
    const valIndices = indices.slice(trainSize)

    const trainDataset = await this.buildDataset(images, labels, trainIndices, config)
    const valDataset = await this.buildDataset(images, labels, valIndices, config)

    return {
      train: trainDataset,
      validation: valDataset
    }
  }

  shuffle (array: number[]): void {
    for (let i = 0; i < array.length; i++) {
      const j = Math.floor(Math.random() * i)
      const swap = array[i]
      array[i] = array[j]
      array[j] = swap
    }
  }
}
