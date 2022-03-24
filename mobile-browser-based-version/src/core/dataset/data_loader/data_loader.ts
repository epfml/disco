import * as tf from '@tensorflow/tfjs'

export abstract class DataLoader {
  abstract load (sources: Array<string>, ...args: any): tf.data.Dataset<any>
}
