import { SourceType } from './source_type'
import { DataLoader } from './data_loader/data_loader'
import * as tf from '@tensorflow/tfjs'

export class DatasetBuilder {
  private sources: Map<SourceType, Array<string>>
  private dataLoader: DataLoader
  private built: boolean

  constructor (dataLoader: DataLoader) {
    this.dataLoader = dataLoader
    this.sources = new Map()
    this.built = false
  }

  addFiles (sourceType: SourceType, sources: Array<string>) {
    if (this.built) {
      throw new Error()
    }
    this.sources.set(sourceType, sources)
  }

  clearFiles (sourceType: SourceType) {
    if (this.built) {
      throw new Error()
    }
    this.sources.set(sourceType, [])
  }

  build (): tf.data.Dataset<tf.TensorContainer> {
    // for now, expect a single source type ({X,y} from a single .csv file)
    const dataset = this.dataLoader.load(this.sources.get(SourceType.DATASET))
    this.built = true
    return dataset
  }

  isBuilt (): boolean {
    return this.built
  }
}
