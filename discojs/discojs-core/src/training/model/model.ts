import { tf, data, Task } from '../..'
import { Trainer } from '../trainer/trainer'

export abstract class Model {
  constructor (public readonly task: Task) {}

  abstract fit (trainer: Trainer, data: data.tuple.DataSplit): Promise<void>

  /**
   * Unwraps the inner TF.js model.
   * @returns The inner TF.js model
   */
  abstract toTfjs (): tf.LayersModel
}
