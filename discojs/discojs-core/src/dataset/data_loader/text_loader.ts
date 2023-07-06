import { TabularLoader } from './tabular_loader'
import { Dataset } from '../dataset'
import { TextData, Data } from '../data'

/**
 * Text data loader whose instantiable implementation is delegated by the platform-dependent Disco subprojects, namely,
 * @epfml/discojs-web and @epfml/discojs-node. Loads data from files whose entries are line-separated and each consist of
 * a sentence-like sample associated to an optional label.
 */
export abstract class TextLoader<Source> extends TabularLoader<Source> {
  abstract loadDatasetFrom (source: Source, config: Record<string, unknown>): Promise<Dataset>

  async createData (dataset: Dataset): Promise<Data> {
    return await TextData.init(dataset, this.task)
  }
}
