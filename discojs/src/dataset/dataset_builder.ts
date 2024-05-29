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
  private _unlabeledSources: Source[]
  /**
   * The buffer of labelled file sources.
   */
  private _labeledSources: Map<string, Source[]>

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
    this._unlabeledSources = []
    // Map from label to sources
    this._labeledSources = Map()
  }

  /**
   * Adds the given file sources to the builder's buffer. Sources may be provided a label in the case
   * of supervised learning.
   * @param sources The array of file sources
   * @param label The file sources label
   */
  addFiles (sources: Source[], label?: string): void {
    if (label === undefined) {
      this._unlabeledSources = this._unlabeledSources.concat(sources)
    } else {
      const currentSources = this._labeledSources.get(label)
      if (currentSources === undefined) {
        this._labeledSources = this._labeledSources.set(label, sources)
      } else {
        this._labeledSources = this._labeledSources.set(label, currentSources.concat(sources))
      }
    }
  }

  /**
   * Clears the file sources buffers. If a label is provided, only the file sources
   * corresponding to the given label will be removed.
   * @param label The file sources label
   */
  clearFiles (label?: string): void {
    if (label === undefined) {
      this._unlabeledSources = []
    } else {
      this._labeledSources = this._labeledSources.delete(label)
    }
  }

  private getLabels (): string[] {
    // We need to duplicate the labels as we need one for each source.
    // Say for label A we have sources [img1, img2, img3], then we
    // need labels [A, A, A].
    let labels: string[][] = []
    this._labeledSources.forEach((sources, label) => {
      const sourcesLabels = Array.from({ length: sources.length }, (_) => label)
      labels = labels.concat(sourcesLabels)
    })
    return labels.flat()
  }

  async build (config?: DataConfig): Promise<DataSplit> {
    // Require that at least one source collection is non-empty, but not both
    if (this._unlabeledSources.length + this._labeledSources.size === 0) {
      throw new Error('No input files connected') // This error message is parsed in Trainer.vue
    }
    let dataTuple: DataSplit
    if (this._unlabeledSources.length > 0) {
      let defaultConfig: DataConfig = {}

      if (config?.inference === true) {
        // Inferring model, no labels needed
        defaultConfig = {
          features: this.task.trainingInformation.inputColumns,
          shuffle: true
        }
      } else {
        // Labels are contained in the given sources
        if (this.task.trainingInformation.outputColumn === undefined)
          throw new Error("tabular data without output column")
        defaultConfig = {
          features: this.task.trainingInformation.inputColumns,
          labels: [this.task.trainingInformation.outputColumn],
          shuffle: true
        }
      }

      dataTuple = await this.dataLoader.loadAll(this._unlabeledSources, { ...defaultConfig, ...config })
    } else {
      // Labels are inferred from the file selection boxes
      const defaultConfig = {
        labels: this.getLabels(),
        shuffle: true
      }
      const sources = this._labeledSources.valueSeq().toArray().flat()
      dataTuple = await this.dataLoader.loadAll(sources, { ...defaultConfig, ...config })
    }
    return dataTuple
  }

  get size (): number {
    return Math.max(this._unlabeledSources.length, this._labeledSources.size)
  }

  get sources (): Source[] {
    return this._unlabeledSources.length > 0 ? this._unlabeledSources : this._labeledSources.valueSeq().toArray().flat()
  }
}
