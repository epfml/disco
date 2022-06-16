import * as tf from '@tensorflow/tfjs'

import { ModelActor } from '../model_actor'
import { Task } from '@/task'
import { Data } from '@/dataset'
import { Logger } from '@/logging'
import { List } from 'immutable'
import { GraphInformant } from '..'

export class Tester extends ModelActor {
  private readonly graphInformant = new GraphInformant()
  private size = 0

  constructor (
    task: Task,
    logger: Logger,
    private readonly model: tf.LayersModel
  ) {
    super(task, logger)
  }

  async testModel (data: Data): Promise<void> {
    const batchSize = this.task.trainingInformation?.batchSize
    if (batchSize === undefined) {
      throw new TypeError('batch size is undefined')
    }

    let hits = 0
    await data.dataset.batch(batchSize).forEachAsync((e) => {
      if (typeof e === 'object' && 'xs' in e && 'ys' in e) {
        const xs = e.xs as tf.Tensor
        const ys = (e.ys as tf.Tensor).dataSync()

        // only supports binary classification for now
        const pred = (this.model.predict(xs, { batchSize: batchSize }) as tf.Tensor).dataSync()

        this.size += batchSize
        hits += List(pred).zip(List(ys)).map(([p, y]: [number, number]) => Math.abs(p - y))
          .reduce((prev: number, curr: number) => prev + curr)
        this.graphInformant.updateAccuracy(hits / this.size)
      } else {
        throw new TypeError('missing feature/label in dataset')
      }
    })
  }

  testingAccuracyData (): List<number> {
    return this.graphInformant.data()
  }

  testingAccuracy (): number {
    return this.graphInformant.accuracy()
  }

  samplesVisited (): number {
    return this.size
  }
}
