import { Model } from './model'
import { Task, data } from '../..'
import { Trainer } from '../trainer/trainer'

import { GPTLMHeadModel } from 'gpt-tfjs'

export class GPTModel extends Model<GPTLMHeadModel> {
  constructor (
    task: Task,
    private readonly minGpt: GPTLMHeadModel
  ) {
    super(task)
  }

  async fit (trainer: Trainer, tuple: data.tuple.DataSplit): Promise<void> {
    const { training, validation } = data.tuple.extract(tuple)

    await this.raw.train(training, {
      epochs: this.task.trainingInformation.epochs,
      verbose: true
    })

    // ...
  }

  get raw (): GPTLMHeadModel {
    return this.minGpt.model
  }
}
