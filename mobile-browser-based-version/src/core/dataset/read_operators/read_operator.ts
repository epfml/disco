import * as tf from '@tensorflow/tfjs'

export abstract class ReadOperator {
  reader: any

  constructor (reader: any) {
    this.reader = reader
  }

  abstract read (files: Array<File>): tf.Tensor // Dataset
}
