import { type Task } from '../..'
import { type Dataset } from '../dataset'
import { type Data, type DataSplit } from '../data'

export interface DataConfig { features?: string[], labels?: string[], shuffle?: boolean, validationSplit?: number, inference?: boolean }

export abstract class DataLoader<Source> {
  constructor (protected task: Task) {}

  abstract createData (dataset: Dataset, size?: number): Promise<Data>

  abstract load (source: Source, config: DataConfig): Promise<Dataset>

  abstract loadAll (sources: Source[], config: DataConfig): Promise<DataSplit>
}
