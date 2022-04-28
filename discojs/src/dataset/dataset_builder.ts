import * as tf from '@tensorflow/tfjs'

import { DataLoader, Data } from './data_loader/data_loader'
import { Task } from '@/task'

export type Dataset = tf.data.Dataset<tf.TensorContainer>

export class DatasetBuilder<Source> {
  private readonly task: Task
  private readonly dataLoader: DataLoader<Source>
  private sources: Source[]
  private readonly labelledSources: Map<string, Source>
  private built: boolean

  constructor (dataLoader: DataLoader<Source>, task: Task) {
    this.dataLoader = dataLoader
    this.task = task
    this.sources = []
    this.labelledSources = new Map()
    this.built = false
  }

  addFiles (sources: Source[], label?: string): void {
    if (this.built) {
      throw new Error('builder already consumed')
    }
    if (label === undefined) {
      this.sources = this.sources.concat(sources)
    } else {
      sources.forEach((source) => this.labelledSources.set(label, source))
    }
  }

  clearFiles (label?: string): void {
    if (this.built) {
      throw new Error('builder already consumed')
    }
    if (label === undefined) {
      this.sources = []
    } else {
      this.labelledSources.delete(label)
    }
  }

  async build (): Promise<Data> {
    // Require that at leat one source collection is non-empty, but not both
    if ((this.sources.length > 0) === (this.labelledSources.size > 0)) {
      throw new Error('invalid sources')
    }

    let data: Data
    if (this.sources.length > 0) {
      // Labels are contained in the given sources
      const config = {
        features: this.task.trainingInformation.inputColumns,
        labels: this.task.trainingInformation.outputColumns
      }
      data = await this.dataLoader.loadAll(this.sources, config)
    } else if (this.labelledSources.size > 0) {
      // Labels are inferred from the file selection boxes
      const config = {
        labels: Array.from(this.labelledSources.keys())
      }
      data = await this.dataLoader.loadAll(Array.from(this.labelledSources.values()), config)
    }
    // TODO @s314cy: Support .csv labels for image datasets
    this.built = true
    return data
  }

  isBuilt (): boolean {
    return this.built
  }

  size (): number {
    return Math.max(this.sources.length, this.labelledSources.size)
  }
}
