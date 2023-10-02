import fs from 'fs'

import { tf, data } from '../..'
import { DataConfig } from 'core/dataset/data_loader'

export class NodeMulImageLoader extends data.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    return tf.node.decodeImage(fs.readFileSync(source)) as tf.Tensor3D
  }

  protected override async buildDataset(images: string[], labels: number[], indices: number[], config?: DataConfig | undefined): Promise<data.Data> {
    const self = this
    const withLabels = config?.labels !== undefined

    async function * inputGenerator (): AsyncGenerator<tf.Tensor> {
        for (let i = 0; i < indices.length; i++) {
            let image = self.readImageFrom(images[indices[i]]);
            yield image;
        }
    }

    function* labelGenerator (): Generator<any> {
        for (let i = 0; i < indices.length; i++) {
            const label = labels[indices[i]];
            const labelOutput = { 
              'logits': tf.tensor(label),
              // 'minDistances': tf.tensor(label)
            }
            yield labelOutput;
        }
    }

    //@ts-expect-error
    const xs: tf.data.Dataset<tf.TensorContainer> = tf.data.generator(inputGenerator);
    const ys: tf.data.Dataset<tf.TensorContainerArray> = tf.data.generator(labelGenerator);

    const dataset: tf.data.Dataset<tf.TensorContainer> = withLabels ? tf.data.zip({ xs, ys }) : xs 

    return await this.createData(dataset, indices.length)
  }
}