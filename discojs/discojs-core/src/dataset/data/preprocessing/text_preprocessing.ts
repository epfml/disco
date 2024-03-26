import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { PreprocessingFunction } from './base.js'
// import { encode } from 'gpt-tokenizer/cjs/model/text-davinci-003'
import { AutoTokenizer } from '@xenova/transformers';

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
  Tokenize
}

const tokenize: PreprocessingFunction = {
  type: TextPreprocessing.Tokenize,
  apply: async (x: Promise<tf.TensorContainer>, task: Task): Promise<tf.TensorContainer> => {
    let xs = await x as string // tf.TextLineDataset yields strings
    const tokenizerName = task.trainingInformation.tokenizer ?? 'Xenova/gpt2'
    const tokenizer = await AutoTokenizer.from_pretrained(tokenizerName)
    const maxSequenceLength = task.trainingInformation.maxSequenceLength ?? tokenizer.model_max_length
    const { input_ids: tokens } = tokenizer(xs, {
      padding: true,
      truncation: true,
      max_length: maxSequenceLength,
      return_tensor: false
    })
    const xsTokens = tf.tensor(tokens, undefined, 'int32') // cast tokens from float to int for gpt-tfjs
    return {
      xs: xsTokens, 
      ys: tf.oneHot(xsTokens, tokenizer.model.vocab.length + 1) // gpt-tfjs expects a one-hot encoded token label
    }
  }
}

/**
 * Available text preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List.of(
  tokenize
).sortBy((e) => e.type)
