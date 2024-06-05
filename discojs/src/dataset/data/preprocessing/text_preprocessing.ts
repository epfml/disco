import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { PreprocessingFunction } from './base.js'
import { models } from '../../../index.js'

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
  Tokenize,
  LeftPadding
}

interface TokenizedEntry extends tf.TensorContainerObject {
  tokens: number []
}

/**
 * LeftPadding pads all incoming inputs to be a fixed length, which should be specified
 * in `task.trainingInformation.maxSequenceLength`. 
 * 
 * We are currently only implementing left padding for text generation 
 * https://huggingface.co/docs/transformers/en/llm_tutorial#wrong-padding-side
 * The function can easily be extended to support right padding if needed
 * 
 * Once Transformers.js supports left padding, it will be possible to pad inputs
 * directly when tokenizing
 * https://github.com/xenova/transformers.js/blob/8804c36591d11d8456788d1bb4b16489121b3be2/src/tokenizers.js#L2517
 */
const leftPadding: PreprocessingFunction = {
  type: TextPreprocessing.LeftPadding,
  apply: async (x: Promise<tf.TensorContainer>, task: Task): Promise<{ xs: tf.Tensor1D, ys: tf.Tensor2D }> => {
    if (x === undefined || !Array.isArray(x) || x.length == 0 || typeof(x[0] !== 'number')) {
      new Error("The leftPadding preprocessing expects a non empty 1D array of number")
    }
    const { tokens } = await x as TokenizedEntry
    const tokenizer = await models.getTaskTokenizer(task)
    return tf.tidy(() => {
      // maxLength is the final length of xs
      // Because ys the contains the tokens in xs shifted by one (to predict the next token), we need
      // to include one more token than maxSequenceLength in order to have the next token's label of the maxSequenceLength'th token
      const maxLength = task.trainingInformation.maxSequenceLength ?? tokenizer.model_max_length as number
      const maxLengthPlusLabel = maxLength + 1
      
      let fixedLengthTokens = tf.tensor1d(tokens, 'int32') // cast tokens from float to int for gpt-tfjs
      if (fixedLengthTokens.size > maxLengthPlusLabel) { // Should never happen because tokenization truncates inputs
        throw Error("There are more tokens than expected after tokenization and truncation")
      } else if (fixedLengthTokens.size < maxLengthPlusLabel) { // Pad inputs to fixed length
        const paddingToken = tokenizer.pad_token_id
        fixedLengthTokens = fixedLengthTokens.pad([[Math.max(0, maxLengthPlusLabel - fixedLengthTokens.size), 0]], paddingToken)
      }
      // if tokens.size == maxLengthPlusLabel we can leave it as it is
      
      // ys is a one-hot encoding of the next token (i.e. xs shifted by one)
      // cast because oneHot isn't size-typing its return value
      const ys = tf.oneHot(fixedLengthTokens.slice([1]), tokenizer.model.vocab.length + 1) as tf.Tensor2D
      // remove the extra token now that ys is created
      const xs = fixedLengthTokens.slice([0], maxLength) 
      return { xs, ys }
    })
  }
}

interface TokenizerOutput {
  input_ids: number[]
}

/**
 * Tokenize and truncates input strings
 */
const tokenize: PreprocessingFunction = {
  type: TextPreprocessing.Tokenize,
  apply: async (x: Promise<tf.TensorContainer>, task: Task): Promise<{ tokens: number[] }> => {
    if (typeof x !== 'string') {
      new Error("The tokenize preprocessing expects a string as input")
    }
    const xs = await x as string // tf.TextLineDataset yields strings
    const tokenizer = await models.getTaskTokenizer(task)
    // Add plus one to include the next token label of the last token in the input sequence
    // The inputs are truncated down to exactly maxSequenceLength in leftPadding
    const maxLength = task.trainingInformation.maxSequenceLength ?? (tokenizer.model_max_length as number)
    const maxLengthPlusLabel = maxLength + 1

    const {input_ids: tokens} = tokenizer(xs, {
      // Transformers.js currently only supports right padding while we need left for text generation
      // Right padding should be supported in the future, once it is, we can directly pad while tokenizing
      // https://github.com/xenova/transformers.js/blob/8804c36591d11d8456788d1bb4b16489121b3be2/src/tokenizers.js#L2517
      padding: false,
      truncation: true,
      return_tensor: false,
      max_length: maxLengthPlusLabel,
    }) as TokenizerOutput
    return { tokens }
  }
}

/**
 * Available text preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List.of(
  tokenize,
  leftPadding
).sortBy((e) => e.type)
