import { Task } from '..'
import { DataSplit } from './data'
import { DataConfig, DataLoader } from './data_loader/data_loader'

export class DatasetBuilder<Source> {
  private readonly task: Task
  private readonly dataLoader: DataLoader<Source>
  private _sources: Source[]
  private readonly labelledSources: Map<string, Source[]>
  private built: boolean

  constructor (dataLoader: DataLoader<Source>, task: Task) {
    this.dataLoader = dataLoader
    this.task = task
    this._sources = []
    this.labelledSources = new Map()
    this.built = false
  }

  get sources (): Source[] {
    return this._sources.length > 0 ? this._sources : Array.from(this.labelledSources.values()).flat()
  }

  addFiles (sources: Source[], label?: string): void {
    if (this.built) {
      this.resetBuiltState()
    }
    if (label === undefined) {
      this._sources = this._sources.concat(sources)
    } else {
      const currentSources = this.labelledSources.get(label)
      if (currentSources === undefined) {
        this.labelledSources.set(label, sources)
      } else {
        this.labelledSources.set(label, currentSources.concat(sources))
      }
    }
  }

  clearFiles (label?: string): void {
    if (this.built) {
      this.resetBuiltState()
    }
    if (label === undefined) {
      this._sources = []
    } else {
      this.labelledSources.delete(label)
    }
  }

  // If files are added or removed, then this should be called since the latest
  // version of the dataset_builder has not yet been built.
  private resetBuiltState (): void {
    this.built = false
  }

  private getLabels (): string[] {
    // We need to duplicate the labels as we need one for each soure.
    // Say for label A we have sources [img1, img2, img3], then we
    // need labels [A, A, A].
    let labels: string[][] = []
    Array.from(this.labelledSources.values()).forEach((sources, index) => {
      const sourcesLabels = Array.from({ length: sources.length }, (_) => index.toString())
      labels = labels.concat(sourcesLabels)
    })
    return labels.flat()
  }

  async build (config?: DataConfig): Promise<DataSplit> {
    // Require that at leat one source collection is non-empty, but not both
    if ((this._sources.length > 0) === (this.labelledSources.size > 0)) {
      throw new Error('Please provide dataset input files')
    }

    let dataTuple: DataSplit
    if (this._sources.length > 0) {
      let defaultConfig: DataConfig = {}

      if (config?.inference) {
        // Inferring model, no labels needed
        defaultConfig = {
          shuffle: false,
          ...config
        }
      } else {
        // Labels are contained in the given sources
        defaultConfig = {
          features: this.task.trainingInformation.inputColumns,
          labels: this.task.trainingInformation.outputColumns,
          shuffle: false,
          ...config
        }
      }

      dataTuple = await this.dataLoader.loadAll(this._sources, defaultConfig)
    } else {
      // Labels are inferred from the file selection boxes
      const defaultConfig = {
        labels: this.getLabels(),
        shuffle: false,
        ...config
      }
      const sources = Array.from(this.labelledSources.values()).flat()
      dataTuple = await this.dataLoader.loadAll(sources, defaultConfig)
    }
    // TODO @s314cy: Support .csv labels for image datasets (supervised training or testing)
    this.built = true
    return dataTuple
  }

  isBuilt (): boolean {
    return this.built
  }

  size (): number {
    return Math.max(this._sources.length, this.labelledSources.size)
  }
}
