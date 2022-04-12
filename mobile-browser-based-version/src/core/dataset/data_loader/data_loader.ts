import { Dataset } from '../dataset_builder'

export type Source = string | File
export type DataConfig = { features?: string[], labels?: string[] }

export abstract class DataLoader {
  abstract load (source: Source, config: DataConfig): Dataset

  abstract loadAll (sources: Source[], config: DataConfig): Dataset
}
