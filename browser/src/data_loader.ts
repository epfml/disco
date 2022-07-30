import { tf, dataset } from '@epfml/discojs'

export class WebImageLoader extends dataset.ImageLoader<File> {
  async readImageFrom (source: File): Promise<tf.Tensor3D> {
    let tensor = tf.browser.fromPixels(await createImageBitmap(source))

    const height = this.task.trainingInformation?.IMAGE_H
    const width = this.task.trainingInformation?.IMAGE_W
    if (
      height !== undefined && width !== undefined &&
      tensor.shape[1] !== height && tensor.shape[0] !== width
    ) {
      tensor = tensor.resizeBilinear([height, width])
    }

    return tensor.div(tf.scalar(255)) as tf.Tensor3D
  }
}

export class WebTabularLoader extends dataset.TabularLoader<File> {
  loadTabularDatasetFrom (source: File, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return new tf.data.CSVDataset(new tf.data.FileDataSource(source), csvConfig)
  }
}
