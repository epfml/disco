import { tf, dataset } from '../..'

export class NodeTabularLoader extends dataset.TabularLoader<string> {
  loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return tf.data.csv(source, csvConfig)
  }
}
