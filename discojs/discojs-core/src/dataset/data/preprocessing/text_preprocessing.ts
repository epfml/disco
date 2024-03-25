import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { PreprocessingFunction } from './base.js'
import { encode } from 'gpt-tokenizer/cjs/model/text-davinci-003'
import { AutoTokenizer } from '@xenova/transformers';

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
  Tokenize,
  Padding
}

interface TokenizedEntry extends tf.TensorContainerObject {
  xs: tf.Tensor1D
}

const padding: PreprocessingFunction = {
  type: TextPreprocessing.Padding,
  apply: (x: tf.TensorContainer, task: Task) => {
    const { xs } = x as TokenizedEntry
    const vocabSize = task.trainingInformation.vocabSize ?? 50258
    const maxLength = task.trainingInformation.maxSequenceLength ?? 128
    // Use the tokenizer paddingToken except if undefined
    // Fallback value to the last value of the vocab size
    const paddingToken = task.trainingInformation.paddingToken ?? vocabSize
    const xsPadded = xs.pad([[0, Math.max(0, maxLength - xs.size)]], paddingToken).slice([0], [maxLength])
    return {
      xs: xsPadded,
      ys: tf.oneHot(xsPadded, vocabSize) // gpt-tfjs expects a one-hot encoded token label
    }
  }
}

const tokenize: PreprocessingFunction = {
  type: TextPreprocessing.Tokenize,
  apply: (x: tf.TensorContainer, task: Task) => {
    const xs = x as string // tf.TextLineDataset yields strings
    // TODO: add to task definition
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');
    const { tokens } = await tokenizer(xs);
    // const tokenizer = { encode }
    // const tokens = tokenizer.encode(xs)

    return {
      xs: tf.tensor(tokens, undefined, 'int32') // cast tokens from float to int for gpt-tfjs
    }
  }
}

/**
 * Available text preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List.of(
  tokenize,
  padding
).sortBy((e) => e.type)
