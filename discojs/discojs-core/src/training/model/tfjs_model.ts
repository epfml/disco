import { data, tf, Task } from '../..'
import { Model } from './model'
import { Trainer } from '../trainer/trainer'

import { List, Map } from 'immutable'

export class TFJSModel extends Model {
  constructor (
    task: Task,
    private readonly model: tf.LayersModel
  ) {
    super(task)
  }

  async fit (trainer: Trainer, tuple: data.tuple.DataSplit): Promise<void> {
    const { training, validation } = data.tuple.extract(tuple)

    await this.model.fitDataset(training, {
      epochs: this.task.trainingInformation.epochs,
      validationData: validation,
      callbacks: Map(
        List.of(
          'onTrainBegin',
          'onTrainEnd',
          'onEpochBegin',
          'onEpochEnd',
          'onBatchBegin',
          'onBatchEnd'
        ).map((callback) => [callback, (trainer as any)[callback]] as [string, () => Promise<void>])
      ).toObject()
    })
  }

  toTfjs (): tf.LayersModel {
    return this.model
  }
}
