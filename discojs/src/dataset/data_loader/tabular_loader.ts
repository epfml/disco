import { tf, dataset } from '@epfml/discojs-core'

export class WebTabularLoader extends dataset.TabularLoader<File> {
  loadTabularDatasetFrom (source: File, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
