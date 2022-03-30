import { SourceType } from './source_type'
import { DataLoader } from './data_loader/data_loader'
import * as tf from '@tensorflow/tfjs'
import { Task } from '../task/task'

export class DatasetBuilder {
  private sources: Map<SourceType, Array<string>>
  private dataLoader: DataLoader
  private task: Task
  private built: boolean

  constructor (dataLoader: DataLoader, task: Task) {
    this.dataLoader = dataLoader
    this.task = task
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
    /**
     * TODO @s314cy:
     * For now, expect a single source type ({X,y} from a single .csv file).
     * The JSON information containing the features and labels should be easier to access
     * and have better key names.
     */
    const dataset = this.dataLoader.load(
      this.sources.get(SourceType.DATASET),
      this.task.displayInformation.headers,
      this.task.trainingInformation.outputColumn
    )
    console.log(`DatasetBuilder: dataset=${dataset}$`) // DEBUG
    this.built = true
    const flattenedDataset = dataset.map(({ xs, ys }) => {
      return { xs: Object.values(xs), ys: Object.values(ys) }
    })
    console.log(`DatasetBuilder: flattenedDataset=${flattenedDataset}`) // DEBUG
    return flattenedDataset
  }

  isBuilt (): boolean {
    return this.built
  }
}
