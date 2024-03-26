import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { PreprocessingFunction } from './base.js'
import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
  Tokenize
}

const tokenize: PreprocessingFunction = {
  type: TextPreprocessing.Tokenize,
  apply: async (x: Promise<tf.TensorContainer>, task: Task): Promise<tf.TensorContainer> => {
    let timePerToken = performance.now()
    let xs = await x as string // tf.TextLineDataset yields strings
    let tokenizer = task.trainingInformation.tokenizerModel as PreTrainedTokenizer
    // The tokenizer is initialized the first time it is needed
    // We're doing so to not send complex objects between the server and clients
    if (tokenizer === undefined) {
      const tokenizerName = task.trainingInformation.tokenizer ?? 'Xenova/gpt2'
      tokenizer = await AutoTokenizer.from_pretrained(tokenizerName)
      task.trainingInformation.tokenizerModel = tokenizer
    }
    task.trainingInformation.tokenizer
    const maxSequenceLength = task.trainingInformation.maxSequenceLength ?? tokenizer.model_max_length
    const { input_ids: tokens } = tokenizer(xs, {
      padding: true,
      truncation: true,
      max_length: maxSequenceLength,
      return_tensor: false
    })
    const xsTokens = tf.tensor(tokens, undefined, 'int32') // cast tokens from float to int for gpt-tfjs
    console.log(performance.now() - timePerToken)
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
