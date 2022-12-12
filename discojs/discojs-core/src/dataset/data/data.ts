import { Task } from '../..'
import { Dataset } from '../dataset'

export abstract class Data {
  protected constructor (
    public readonly dataset: Dataset,
    public readonly task: Task,
    public readonly size?: number) {}

  static async init (
    dataset: Dataset,
    task: Task,
    size?: number
  ): Promise<Data> {
    throw new Error('abstract')
  }

  abstract batch (): Data

  abstract preprocess (): Promise<Data>
}
