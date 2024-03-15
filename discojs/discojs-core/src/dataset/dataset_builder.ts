import type { Task } from '../index.js'

import type { DataSplit } from './data/index.js'
import type { DataConfig, DataLoader } from './data_loader/data_loader.js'

import { Map } from 'immutable'

/**
 * Incrementally builds a dataset from the provided file sources. The sources may
 * either be file blobs or regular file system paths.
 */
export class DatasetBuilder<Source> {
  /**
   * The buffer of unlabelled file sources.
   */
  private _sources: Source[]
  /**
   * The buffer of labelled file sources.
   */
  private labelledSources: Map<string, Source[]>
  /**
   * Whether a dataset was already produced.
   */
  private _built: boolean

  constructor (
    /**
     * The data loader used to load the data contained in the provided files.
     */
    private readonly dataLoader: DataLoader<Source>,
    /**
     * The task for which the dataset should be built.
     */
    public readonly task: Task
  ) {
    this._sources = []
    this.labelledSources = Map()
    this._built = false
  }

  /**
   * Adds the given file sources to the builder's buffer. Sources may be provided a label in the case
   * of supervised learning.
   * @param sources The array of file sources
   * @param label The file sources label
   */
  addFiles (sources: Source[], label?: string): void {
    if (this.built) {
      this.resetBuiltState()
    }
    if (label === undefined) {
      this._sources = this._sources.concat(sources)
    } else {
      const currentSources = this.labelledSources.get(label)
      if (currentSources === undefined) {
        this.labelledSources = this.labelledSources.set(label, sources)
      } else {
        this.labelledSources = this.labelledSources.set(label, currentSources.concat(sources))
      }
    }
  }

  /**
   * Clears the file sources buffers. If a label is provided, only the file sources
   * corresponding to the given label will be removed.
   * @param label The file sources label
   */
  clearFiles (label?: string): void {
    if (this.built) {
      this.resetBuiltState()
    }
    if (label === undefined) {
      this._sources = []
    } else {
      this.labelledSources = this.labelledSources.delete(label)
    }
  }

  // If files are added or removed, then this should be called since the latest
  // version of the dataset_builder has not yet been built.
  private resetBuiltState (): void {
    this._built = false
  }

  private getLabels (): string[] {
    // We need to duplicate the labels as we need one for each soure.
    // Say for label A we have sources [img1, img2, img3], then we
    // need labels [A, A, A].
    let labels: string[][] = []
    this.labelledSources.valueSeq().forEach((sources, index) => {
      const sourcesLabels = Array.from({ length: sources.length }, (_) => index.toString())
      labels = labels.concat(sourcesLabels)
    })
    return labels.flat()
  }

  async build (config?: DataConfig): Promise<DataSplit> {
    // Require that at least one source collection is non-empty, but not both
    if ((this._sources.length > 0) === (this.labelledSources.size > 0)) {
      throw new Error('Please provide dataset input files')
    }

    let dataTuple: DataSplit
    if (this._sources.length > 0) {
      let defaultConfig: DataConfig = {}

      if (config?.inference === true) {
        // Inferring model, no labels needed
        defaultConfig = {
          features: this.task.trainingInformation.inputColumns,
          shuffle: false
        }
      } else {
        // Labels are contained in the given sources
        defaultConfig = {
          features: this.task.trainingInformation.inputColumns,
          labels: this.task.trainingInformation.outputColumns,
          shuffle: false
        }
      }

      dataTuple = await this.dataLoader.loadAll(this._sources, { ...defaultConfig, ...config })
    } else {
      // Labels are inferred from the file selection boxes
      const defaultConfig = {
        labels: this.getLabels(),
        shuffle: false
      }
      const sources = this.labelledSources.valueSeq().toArray().flat()
      dataTuple = await this.dataLoader.loadAll(sources, defaultConfig)
    }
    // TODO @s314cy: Support .csv labels for image datasets (supervised training or testing)
    this._built = true
    return dataTuple
  }

  /**
   * Whether the dataset builder has already been consumed to produce a dataset.
   */
  get built (): boolean {
    return this._built
  }

  get size (): number {
    return Math.max(this._sources.length, this.labelledSources.size)
  }

  get sources (): Source[] {
    return this._sources.length > 0 ? this._sources : this.labelledSources.valueSeq().toArray().flat()
  }
}
