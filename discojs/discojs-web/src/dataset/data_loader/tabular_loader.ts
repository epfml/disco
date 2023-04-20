import { Dataset } from 'core/dataset'
import { tf, data } from '../..'

export class WebTabularLoader extends data.TabularLoader<File> {
  async loadDatasetFrom (source: File, csvConfig: Record<string, unknown>): Promise<Dataset> {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
