import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { data, Model, Task, Logger, client as clients, Memory, ModelSource, Features } from '../index.js'
import { GraphInformant } from '../index.js'

export class Validator {
  private readonly graphInformant = new GraphInformant()
  private size = 0
  private _confusionMatrix: number[][] | undefined

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

  private async getLabel (ys: tf.Tensor): Promise<Float32Array | Int32Array | Uint8Array> {
    switch (ys.shape[1]) {
      case 1:
        return await ys.greaterEqual(tf.scalar(0.5)).data()
      case 2:
        return await ys.argMax(1).data()
      default:
        throw new Error(`unable to reduce tensor of shape: ${ys.shape.toString()}`)
    }
  }

  async assess (data: data.Data, useConfusionMatrix: boolean = false): Promise<Array<{ groundTruth: number, pred: number, features: Features }>> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('Batch size is undefined')
    }

    const model = await this.getModel()

    let features: Features[] = []
    const groundTruth: number[] = []

    let hits = 0
    // Get model predictions per batch and flatten the result
    // Also build the features and groudTruth arrays
    const predictions: number[] = (await data.preprocess().dataset.batch(batchSize)
      .mapAsync(async e => {
        if (typeof e === 'object' && 'xs' in e && 'ys' in e) {
          const xs = e.xs as tf.Tensor
          const ys = await this.getLabel(e.ys as tf.Tensor)
          const pred = await this.getLabel(await model.predict(xs))

          const currentFeatures = await xs.array()
          if (Array.isArray(currentFeatures)) {
            features = features.concat(currentFeatures)
          } else {
            throw new TypeError('Data format is incorrect')
          }
          groundTruth.push(...Array.from(ys))
          this.size += xs.shape[0]
          hits += List(pred).zip(List(ys)).filter(([p, y]) => p === y).size
          // TODO: Confusion Matrix stats
          const currentAccuracy = hits / this.size
          this.graphInformant.updateAccuracy(currentAccuracy)
          return Array.from(pred)
        } else {
          throw new Error('Input data is missing a feature or the label')
        }
      }).toArray()).flat()

    this.logger.success(`Obtained validation accuracy of ${this.accuracy}`)
    this.logger.success(`Visited ${this.visitedSamples} samples`)

    if (useConfusionMatrix) {
      try {
        this._confusionMatrix = tf.math.confusionMatrix(
          [],
          [],
          0
        ).arraySync()
      } catch (e) {
        console.error(e instanceof Error ? e.message : e)
        throw new Error('Failed to compute the confusion matrix')
      }
    }

    return (List(groundTruth)
      .zip(List(predictions), List(features)) as List<[number, number, Features]>)
      .map(([gt, p, f]) => ({ groundTruth: gt, pred: p, features: f }))
      .toArray()
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

  get accuracyData (): List<number> {
    return this.graphInformant.data()
  }

  get accuracy (): number {
    return this.graphInformant.accuracy()
  }

  get visitedSamples (): number {
    return this.size
  }

  get confusionMatrix (): number[][] | undefined {
    return this._confusionMatrix
  }
}
