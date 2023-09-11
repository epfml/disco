import { tf, data, Task } from '../..'
import { Model } from './model'
import { Trainer } from '../trainer/trainer'

import { GPTLMHeadModel } from 'gpt-tfjs'

export class GPTModel extends Model {
  constructor (
    task: Task,
    private readonly minGpt: GPTLMHeadModel
  ) {
    super(task)
  }

  async fit (trainer: Trainer, tuple: data.tuple.DataSplit): Promise<void> {
    const { training, validation } = data.tuple.extract(tuple)

    await this.minGpt.train(training, {
      epochs: this.task.trainingInformation.epochs,
      verbose: true
    })

    // ...
  }

  toTfjs (): tf.LayersModel {
    return this.minGpt.model
  }
}
