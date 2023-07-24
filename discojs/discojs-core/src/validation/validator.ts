import { List } from 'immutable'

import { tf, data, Task, Logger, client as clients, GraphInformant, Memory, ModelSource, Features } from '..'

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
      throw new Error('cannot identify model')
    }
  }

  private getLabel (ys: tf.Tensor): Float32Array | Int32Array | Uint8Array {
    if (this.task.trainingInformation.modelCompileData.loss === 'binaryCrossentropy') {
      return ys.greaterEqual(tf.scalar(0.5)).dataSync()
    } else {
      return ys.argMax(1).dataSync()
    }
  }

  async assess (data: data.Data, useConfusionMatrix?: boolean): Promise<Array<{groundTruth: number, pred: number, features: Features}>> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('batch size is undefined')
    }

    const model = await this.getModel()

    let features: Features[] = []
    const groundTruth: number[] = []
    const predictions: number[] = []

    let hits = 0
    await data.preprocess().batch().dataset.forEachAsync((e) => {
      if (typeof e === 'object' && 'xs' in e && 'ys' in e) {
        const xs = e.xs as tf.Tensor

        const ys = this.getLabel(e.ys as tf.Tensor)
        const pred = this.getLabel(model.predict(xs, { batchSize }) as tf.Tensor)

        const currentFeatures = xs.arraySync()

        if (Array.isArray(currentFeatures)) {
          features = features.concat(currentFeatures)
        } else {
          throw new TypeError('features array is not correct')
        }

        groundTruth.push(...Array.from(ys))
        predictions.push(...Array.from(pred))

        this.size += xs.shape[0]

        hits += List(pred).zip(List(ys)).filter(([p, y]) => p === y).size

        // TODO: Confusion Matrix stats

        const currentAccuracy = hits / this.size
        this.graphInformant.updateAccuracy(currentAccuracy)
      } else {
        throw new Error('missing feature/label in dataset')
      }
    })
    this.logger.success(`Obtained validation accuracy of ${this.accuracy}`)
    this.logger.success(`Visited ${this.visitedSamples} samples`)

    if (useConfusionMatrix) {
      try {
        this._confusionMatrix = tf.math.confusionMatrix(
          [],
          [],
          0
        ).arraySync()
      } catch (e: any) {
        console.error(e instanceof Error ? e.message : e.toString())
        throw new Error('Failed to compute the confusion matrix')
      }
    }

    return (List(groundTruth)
      .zip(List(predictions), List(features)) as List<[number, number, Features]>)
      .map(([gt, p, f]) => ({ groundTruth: gt, pred: p, features: f }))
      .toArray()
  }

  async predict (data: data.Data): Promise<number[]> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('batch size is undefined')
    }

    const model = await this.getModel()
    const predictions: number[] = []

    await data.dataset
      .batch(batchSize)
      .forEachAsync(e =>
        predictions.push(...(model.predict(e as tf.Tensor, { batchSize: batchSize }) as tf.Tensor).argMax(1).arraySync() as number[]))

    return predictions
  }

  async getModel (): Promise<tf.LayersModel> {
    if (this.source !== undefined && await this.memory.contains(this.source)) {
      return await this.memory.getModel(this.source)
    }

    if (this.client !== undefined) {
      return await this.client.getLatestModel()
    }

    throw new Error('cannot identify model')
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
