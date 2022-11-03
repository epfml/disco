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

  async assess (data: data.Data): Promise<void> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('batch size is undefined')
    }

    const labels: string[] | undefined = this.task.trainingInformation?.LABEL_LIST
    const classes = labels?.length ?? 1

    const model = await this.getModel()

    let hits = 0
    await data.dataset.batch(batchSize).forEachAsync((e) => {
      if (typeof e === 'object' && 'xs' in e && 'ys' in e) {
        const xs = e.xs as tf.Tensor
        const ys = (e.ys as tf.Tensor).dataSync()

        const pred = (model.predict(xs, { batchSize: batchSize }) as tf.Tensor)
          .dataSync()
          .map(Math.round)

        this.size += xs.shape[0]

        hits += List(pred).zip(List(ys))
          .map(([p, y]) => 1 - Math.abs(p - y))
          .reduce((acc: number, e) => acc + e) / classes

        const currentAccuracy = hits / this.size
        this.graphInformant.updateAccuracy(currentAccuracy)
      } else {
        throw new TypeError('missing feature/label in dataset')
      }
    })
    this.logger.success(`Obtained validation accuracy of ${this.accuracy()}`)
    this.logger.success(`Visited ${this.visitedSamples()} samples`)
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
