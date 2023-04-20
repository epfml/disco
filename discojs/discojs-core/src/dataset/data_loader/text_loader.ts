import { TabularLoader } from './tabular_loader'
import { Dataset } from '../dataset'
import { TextData, Data } from '../data'

export abstract class TextLoader<Source> extends TabularLoader<Source> {
  abstract loadDatasetFrom (source: Source, config: Record<string, unknown>): Promise<Dataset>

  async createData (dataset: Dataset): Promise<Data> {
    return await TextData.init(dataset, this.task)
  }
}
