import { tf, data, Task } from '../..'
import { Trainer } from '../trainer/trainer'

/**
 * Convenient interface to a TF.js model allowing for custom fit functions, while keeping
 * the model object compatible with TF.js.
 */
export abstract class Model {
  constructor (public readonly task: Task) {}

  abstract fit (trainer: Trainer, data: data.tuple.DataSplit): Promise<void>

  /**
   * Unwraps the inner TF.js model.
   * @returns The inner TF.js model
   */
  abstract toTfjs (): tf.LayersModel
}
