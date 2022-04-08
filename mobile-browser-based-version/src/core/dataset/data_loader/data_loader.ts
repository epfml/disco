import { Dataset, LabelledDataset } from '../dataset_builder'

export type Source = string | File
export type DataConfig = { features?: string[], labels?: string[] }

export abstract class DataLoader {
  abstract load (source: Source, config: DataConfig): Dataset

  abstract loadAll (sources: Source[], config: DataConfig): Dataset

  static flattenDataset (dataset: LabelledDataset): LabelledDataset {
    return dataset.map(({ xs, ys }) => {
      return {
        xs: Object.values(xs),
        ys: Object.values(ys)
      }
    })
  }
}
