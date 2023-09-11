import { data, Task } from '../..'
import { Trainer } from '../trainer/trainer'

export abstract class Model<T> {
  constructor (public readonly task: Task) {}

  abstract fit (trainer: Trainer, data: data.tuple.DataSplit): Promise<void>

  abstract get raw (): T
}
