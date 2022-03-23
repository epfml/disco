import * as tf from '@tensorflow/tfjs'

export abstract class DataLoader {
  abstract load (sources: Array<string>): tf.data.Dataset<any>
}
