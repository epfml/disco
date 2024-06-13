import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { data, Model, Task, Logger, client as clients, Memory, ModelSource, Features } from '../index.js'

export class Validator {
  private size = 0
  private _confusionMatrix: number[][] | undefined
  private rollingAccuracy = 0

  constructor (
    public readonly task: Task,
    public readonly logger: Logger,
    private readonly memory: Memory,
    private readonly source?: ModelSource,
    private readonly client?: clients.Client
  ) {
    if (source === undefined && client === undefined) {
      throw new Error('To initialize a Validator, either or both a source and client need to be specified')
    }
  }

  private async getLabel(ys: tf.Tensor): Promise<Float32Array | Int32Array | Uint8Array> {
    // Binary classification
    if (ys.shape[1] == 1) {
      const threshold = tf.scalar(0.5)
      const binaryTensor = ys.greaterEqual(threshold)
      const binaryArray = await binaryTensor.data()
      tf.dispose([binaryTensor, threshold])
      return binaryArray
      // Multi-class classification
      } else {
      const yIdxTensor = ys.argMax(-1)
      const yIdx = await yIdxTensor.data()
      tf.dispose([yIdxTensor])
      return yIdx
    }
    // Multi-label classification is not supported
  }

  // test assumes data comes with labels while predict doesn't
  async *test(data: data.Data):
    AsyncGenerator<Array<{ groundTruth: number, pred: number, features: Features }>, void> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('Batch size is undefined')
    }
    const model = await this.getModel()
    let hits = 0
    let iteration = 1
    const iterator = await data.preprocess().dataset.batch(batchSize).iterator()
    let next = await iterator.next()
    while (next.done !== true) {
      const { xs, ys } = next.value as { xs: tf.Tensor2D, ys: tf.Tensor3D }
      const ysLabel = await this.getLabel(ys)
      const yPredTensor = await model.predict(xs)
      const pred = await this.getLabel(yPredTensor)
      const currentFeatures = await xs.array()
      this.size += ysLabel.length
      hits += List(pred).zip(List(ysLabel)).filter(([p, y]) => p === y).size
      this.rollingAccuracy = hits / this.size
      tf.dispose([xs, ys, yPredTensor])

      yield (List(ysLabel).zip(List(pred), List(currentFeatures)) as List<[number, number, Features]>)
        .map(([gt, p, f]) => ({ groundTruth: gt, pred: p, features: f }))
        .toArray()
      
      iteration++
      next = await iterator.next()
    }
    
    this.logger.success(`Obtained validation accuracy of ${this.accuracy}`)
    this.logger.success(`Visited ${this.visitedSamples} samples`)
  }

  async predict (data: data.Data): Promise<Array<{ features: Features, pred: number }>> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('Batch size is undefined')
    }

    const model = await this.getModel()
    let features: Features[] = []

    // Get model prediction per batch and flatten the result
    // Also incrementally build the features array
    const predictions: number[] = (await data.preprocess().dataset.batch(batchSize)
      .mapAsync(async e => {
        const xs = e as tf.Tensor
        const currentFeatures = await xs.array()

        if (Array.isArray(currentFeatures)) {
          features = features.concat(currentFeatures)
        } else {
          throw new TypeError('Data format is incorrect')
        }

        const pred = await this.getLabel(await model.predict(xs))
        return Array.from(pred)
      }).toArray()).flat()

    return List(features).zip(List(predictions))
      .map(([f, p]) => ({ features: f, pred: p }))
      .toArray()
  }

  async getModel (): Promise<Model> {
    if (this.source !== undefined && await this.memory.contains(this.source)) {
      return await this.memory.getModel(this.source)
    }

    if (this.client !== undefined) {
      return await this.client.getLatestModel()
    }

    throw new Error('Could not load the model')
  }

  get accuracy (): number {
    return this.rollingAccuracy
  }

  get visitedSamples (): number {
    return this.size
  }

  get confusionMatrix (): number[][] | undefined {
    return this._confusionMatrix
  }
}
