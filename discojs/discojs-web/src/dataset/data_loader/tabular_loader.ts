import { tf, data } from '../..'

export class WebTabularLoader extends data.TabularLoader<File> {
  loadTabularDatasetFrom (source: File, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
