import type { DataSplit, Dataset } from '../index.js'

export interface DataConfig { features?: string[], labels?: string[], shuffle?: boolean, validationSplit?: number, inference?: boolean }

export abstract class DataLoader<Source> {
  abstract load (source: Source, config: DataConfig): Promise<Dataset>
  abstract loadAll (sources: Source[], config: DataConfig): Promise<DataSplit>
}
