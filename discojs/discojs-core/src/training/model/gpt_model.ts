import { tf, data, Task } from '../..'
import { Model } from './model'
import { Trainer } from '../trainer/trainer'

import { model as GPTModels } from 'gpt-tfjs'

export class GPTModel extends Model {
  constructor (
    task: Task,
    private readonly minGpt: GPTModels.GPTLMHeadModel
  ) {
    super(task)
  }

  async fit (trainer: Trainer, tuple: data.tuple.DataSplit): Promise<void> {
    const { training } = data.tuple.extract(tuple)
    const { epochs, vocabSize } = this.task.trainingInformation

    await trainer.onTrainBegin()
    await this.minGpt.train(training, {
      epochs,
      vocabSize,
      verbose: true,
      callbacks: [trainer.onEpochEnd]
    })
    await trainer.onTrainEnd()
  }

  toTfjs (): tf.LayersModel {
    // TODO: extract the layers model from the gpt object
    return this.minGpt.model
  }
}
