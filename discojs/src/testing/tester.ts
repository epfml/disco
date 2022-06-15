import { ModelActor } from '../model_actor'

import * as tf from '@tensorflow/tfjs'
import { Task } from '@/task'
import { Logger } from '@/logging'

export class Tester extends ModelActor {
  constructor (
    task: Task,
    logger: Logger,
    private readonly model: tf.LayersModel
  ) {
    super(task, logger)
  }

  async testModel (dataset: tf.data.Dataset<{}>): Promise<boolean> {
    await this.model.evaluateDataset(dataset)
    return true
  }
}

export default Tester
