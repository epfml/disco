import { tf, dataset } from '@epfml/discojs'

export class WebImageLoader extends dataset.ImageLoader<File> {
  async readImageFrom (source: File): Promise<tf.Tensor3D> {
    return tf.browser.fromPixels(await createImageBitmap(source))
  }
}

export class WebTabularLoader extends dataset.TabularLoader<File> {
  loadTabularDatasetFrom (source: File, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
