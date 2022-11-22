import { List } from 'immutable'

import { tf, data, Task, Logger, Client, GraphInformant, Memory, ModelSource } from '..'

export class Validator {
  private readonly graphInformant = new GraphInformant()
  private size = 0

  constructor (
    public readonly task: Task,
    public readonly logger: Logger,
    private readonly memory: Memory,
    private readonly source?: ModelSource,
    private readonly client?: Client
  ) {
    if (source === undefined && client === undefined) {
      throw new Error('cannot identify model')
    }
  }

  async assess (data: data.Data): Promise<Array<{'groundTruth': number, 'pred': number}>> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('batch size is undefined')
    }

    const model = await this.getModel()

    const groundTruth: number[] = []
    const predictions: number[] = []

    let hits = 0
    await data.dataset.batch(batchSize).forEachAsync((e) => {
      if (typeof e === 'object' && 'xs' in e && 'ys' in e) {
        const xs = e.xs as tf.Tensor
        const ys = (e.ys as tf.Tensor).argMax(1).dataSync()

        const pred = (model.predict(xs, { batchSize: batchSize }) as tf.Tensor)
          .argMax(1)
          .dataSync()

        groundTruth.push(...Array.from(ys))
        predictions.push(...Array.from(pred))

        this.size += xs.shape[0]

        hits += List(pred).zip(List(ys)).filter(([p, y]) => p === y).size

        const currentAccuracy = hits / this.size
        this.graphInformant.updateAccuracy(currentAccuracy)
      } else {
        throw new TypeError('missing feature/label in dataset')
      }
    })
    this.logger.success(`Obtained validation accuracy of ${this.accuracy()}`)
    this.logger.success(`Visited ${this.visitedSamples()} samples`)

    return List(groundTruth).zip(List(predictions)).map(([gt, p]) => ({ groundTruth: gt, pred: p })).toArray()
  }

  async predict (data: data.Data): Promise<number[]> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('batch size is undefined')
    }

    const model = await this.getModel()
    const predictions: number[] = []

    await data.dataset.batch(batchSize).forEachAsync(e => predictions.push(...Array.from((model.predict(e as tf.Tensor, { batchSize: batchSize }) as tf.Tensor).argMax(1).dataSync())))

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

  accuracyData (): List<number> {
    return this.graphInformant.data()
  }

  accuracy (): number {
    return this.graphInformant.accuracy()
  }

  visitedSamples (): number {
    return this.size
  }
}
