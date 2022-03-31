import * as tf from '@tensorflow/tfjs'

export type Source = string | File

export abstract class DataLoader {
  abstract load (sources: Array<Source>, ...args: any): tf.data.Dataset<any>
}
