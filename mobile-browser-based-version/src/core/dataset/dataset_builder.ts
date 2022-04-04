import { SourceType } from './source_type'
import { DataLoader, Source } from './data_loader/data_loader'
import * as tf from '@tensorflow/tfjs'
import { Task } from '../task/task'

export type Dataset = tf.data.Dataset<tf.TensorContainer>

export class DatasetBuilder {
  private sources: Map<SourceType, Array<Source>>
  private dataLoader: DataLoader
  private task: Task
  private built: boolean

  constructor (dataLoader: DataLoader, task: Task) {
    this.dataLoader = dataLoader
    this.task = task
    this.sources = new Map()
    this.built = false
  }

  addFiles (sourceType: SourceType, sources: Source[]) {
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

  build (): Dataset {
    switch (this.task.trainingInformation.dataType) {
      case 'tabular':
        break
      case 'image':
        break
      default:
        throw new Error('not implemented')
    }
    /**
     * TODO @s314cy:
     * For now, expect a single source type ({X,y} from a single .csv file).
     */
    const dataset = this.dataLoader.load(
      this.sources.get(SourceType.DATASET),
      this.task.trainingInformation.inputColumns,
      this.task.trainingInformation.outputColumns
    )
    this.built = true
    /**
     * TODO @s314cy:
     * Should not assume the dataset includes labels. Linked to the TODO above.
     */
    const flattenedDataset = dataset.map(({ xs, ys }) => {
      return { xs: Object.values(xs), ys: Object.values(ys) }
    }).batch(this.task.trainingInformation.batchSize)
    return flattenedDataset
  }

  isBuilt (): boolean {
    return this.built
  }
}
