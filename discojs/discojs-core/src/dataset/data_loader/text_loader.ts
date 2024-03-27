import type { Task } from '../../index.js'

import type { DataSplit, Dataset } from '../index.js'
import { TextData } from '../index.js'

import { DataLoader, DataConfig } from './index.js'

/**
 * Text data loader whose instantiable implementation is delegated by the platform-dependent Disco subprojects, namely,
 * @epfml/discojs-web and @epfml/discojs-node.
 */
export abstract class TextLoader<S> extends DataLoader<S> {
  constructor (
    private readonly task: Task
  ) {
    super()
  }

  abstract loadDatasetFrom (source: S): Promise<Dataset>

  async load (source: S, config?: DataConfig): Promise<Dataset> {
    const dataset = await this.loadDatasetFrom(source)
    // 1st arg: Stream shuffling buffer size
    return (config?.shuffle === undefined || config?.shuffle) ? dataset.shuffle(1000, undefined, true) : dataset
  }

  async loadAll (sources: S[], config?: DataConfig): Promise<DataSplit> {
    const concatenated =
      (await Promise.all(sources.map(async (src) => await this.load(src, config))))
        .reduce((acc, dataset) => acc.concatenate(dataset))

    return {
      train: await TextData.init(concatenated, this.task)
    }
  }
}
