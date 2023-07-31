import { tf } from '../..'
import { Dataset } from '../../core/dataset'
import { TextLoader } from '../../core/dataset/data_loader/text_loader'

export class WebTextLoader extends TextLoader<File> {
  async loadDatasetFrom (source: File, config?: Record<string, unknown>): Promise<Dataset> {
    const file = new tf.data.FileDataSource(source)
    if (config !== undefined) {
      return new tf.data.CSVDataset(file, config)
    } else {
      return new tf.data.TextLineDataset(file)
    }
  }
}
