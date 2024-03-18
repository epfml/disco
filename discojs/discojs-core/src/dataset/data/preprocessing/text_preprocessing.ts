import { List } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { PreprocessingFunction } from './base.js'

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
  Tokenize,
  Padding
}

interface TextEntry extends tf.TensorContainerObject {
  xs: string[]
  ys: number[]
}

interface TokenizedEntry extends tf.TensorContainerObject {
  xs: tf.Tensor1D
  ys: tf.Tensor1D
}

// TODO that'll fail everytime
const gpt3Tokenizer = null as unknown as { encode: (_: string) => { bpe: number[]; text: string[] } }

const padding: PreprocessingFunction = {
  type: TextPreprocessing.Padding,
  apply: (x: tf.TensorContainer) => {
    const { xs, ys } = x as TokenizedEntry
    // TODO: add to task definition
    const maxLength = 64
    if (maxLength === undefined) {
      return { xs, ys }
    }
    return {
      xs: xs
        .pad([[0, Math.max(0, maxLength - xs.size)]])
        .slice([0], [maxLength]),
      ys
    }
  }
}

const tokenize: PreprocessingFunction = {
  type: TextPreprocessing.Tokenize,
  apply: (x: tf.TensorContainer) => {
    const { xs, ys } = x as TextEntry

    const tokenized = gpt3Tokenizer.encode(xs[0]).bpe

    return {
      xs: tf.tensor(tokenized),
      ys: tf.tensor(ys)
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
