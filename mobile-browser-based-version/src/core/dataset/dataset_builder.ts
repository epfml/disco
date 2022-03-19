import { Dataset } from './dataset'
import { ReadOperator } from './read_operators/read_operator'

export class DatasetBuilder {
  samples: Array<File>
  labels: Array<File>
  readOperator: ReadOperator
  consumed: boolean

  constructor (readOperator: ReadOperator) {
    this.readOperator = readOperator
    this.samples = new Array<File>()
    this.labels = new Array<File>()
    this.consumed = false
  }

  addFiles (dataType: DataType, files: Array<File>) {

  }

  clearFiles () {
    this.samples = new Array<File>()
    this.labels = new Array<File>()
  }

  /**
   * 1. read from files
   * 2. feed the tf dataset with read data
   */
  build (): Dataset {
    this.readOperator.read(this.samples)
    this.consumed = true
    return new Dataset(true)
  }
}
