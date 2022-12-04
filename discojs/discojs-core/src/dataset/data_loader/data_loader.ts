import { Task } from '../..'
import { Dataset } from '../dataset'
import { DataSplit } from '../data'

export interface DataConfig { features?: string[], labels?: string[], shuffle?: boolean, validationSplit?: number, inference?: boolean }

export abstract class DataLoader<Source> {
  protected task: Task

  constructor (task: Task) {
    this.task = task
  }

  abstract load (source: Source, config: DataConfig): Promise<Dataset>

  abstract loadAll (sources: Source[], config: DataConfig): Promise<DataSplit>
}
