import type { Task } from '../..'

import type { DataSplit, Dataset } from '..'
import { TextData } from '..'

import { DataLoader } from '.'

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

  async load (source: S): Promise<Dataset> {
    return await this.loadDatasetFrom(source)
  }

  async loadAll (sources: S[]): Promise<DataSplit> {
    const concatenated =
      (await Promise.all(sources.map(async (src) => await this.load(src))))
        .reduce((acc, dataset) => acc.concatenate(dataset))

    return {
      train: await TextData.init(concatenated, this.task)
    }
  }
}
