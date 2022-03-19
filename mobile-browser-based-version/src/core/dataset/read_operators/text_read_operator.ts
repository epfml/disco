import { ReadOperator } from './read_operator'
import * as tf from '@tensorflow/tfjs'
import _ from 'lodash'

export class TextReadOperator extends ReadOperator {
    separator: string

    constructor (reader: (file: File) => any, separator: string) {
      super(reader)
      this.separator = separator
    }

    read (files: Array<File>): tf.Tensor {

      _.forEach(files, file => {

      })

    }
}