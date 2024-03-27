import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { PreprocessingFunction } from './base.js'
import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
  Tokenize,
  LeftPadding
}

interface TokenizedEntry extends tf.TensorContainerObject {
  xs: tf.Tensor1D
}

/**
 * We are currently only implementing left padding for text generation 
 * https://huggingface.co/docs/transformers/en/llm_tutorial#wrong-padding-side
 * The function can easily be extended to support right padding once the need arise
 */
const leftPadding: PreprocessingFunction = {
  type: TextPreprocessing.LeftPadding,
  apply: async (x: Promise<tf.TensorContainer>, task: Task): Promise<tf.TensorContainer> => {
    let { xs } = await x as TokenizedEntry
    let tokenizer = task.trainingInformation.tokenizer as PreTrainedTokenizer
    if (tokenizer === undefined) {
      const tokenizerName = task.trainingInformation.tokenizerName ?? 'Xenova/gpt2'
      tokenizer = await AutoTokenizer.from_pretrained(tokenizerName)
      task.trainingInformation.tokenizer = tokenizer
    }
    const maxLength = task.trainingInformation.maxSequenceLength ?? tokenizer.model_max_length as number
    // Should never happen because tokenization truncates inputs
    if (xs.size > maxLength) {
      xs = xs.slice([0], [maxLength])
    } else if (xs.size < maxLength) {
      const paddingToken = tokenizer.pad_token_id
      xs = xs.pad([[Math.max(0, maxLength - xs.size), 0]], paddingToken)
    }
    // if xs.size == maxLength we can leave it as it is
    return {
      xs,
      ys: tf.oneHot(xs, tokenizer.model.vocab.length + 1) // gpt-tfjs expects a one-hot encoded token label
    }
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
  apply: async (x: Promise<tf.TensorContainer>, task: Task): Promise<tf.TensorContainer> => {
    const xs = await x as string // tf.TextLineDataset yields strings
    let tokenizer = task.trainingInformation.tokenizer as PreTrainedTokenizer
    // The tokenizer is initialized the first time it is needed
    // We're doing so to not send complex objects between the server and clients
    if (tokenizer === undefined) {
      const tokenizerName = task.trainingInformation.tokenizerName ?? 'Xenova/gpt2'
      tokenizer = await AutoTokenizer.from_pretrained(tokenizerName)
      task.trainingInformation.tokenizer = tokenizer
    }
    const maxLength = task.trainingInformation.maxSequenceLength ?? tokenizer.model_max_length as number

    const {input_ids: tokens} = tokenizer(xs, {
      // Transformers.js currently only supports right padding while we need left for text generation
      // Right padding should be supported in the future, once it is, we can directly pad while tokenizing
      // https://github.com/xenova/transformers.js/blob/8804c36591d11d8456788d1bb4b16489121b3be2/src/tokenizers.js#L2517
      padding: false,
      truncation: true,
      return_tensor: false,
      max_length: maxLength,
    }) as TokenizerOutput
    return {
      xs: tf.tensor(tokens, undefined, 'int32') // cast tokens from float to int for gpt-tfjs}
    }
  }
}

/**
 * Available text preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List.of(
  tokenize,
  leftPadding
).sortBy((e) => e.type)
