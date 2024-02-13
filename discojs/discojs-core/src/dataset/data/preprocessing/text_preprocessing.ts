import { type Task, tf } from '../../..'
import { type PreprocessingFunction } from './base'

import { List } from 'immutable'

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

const gpt3Tokenizer = null as any

const padding: PreprocessingFunction = {
  type: TextPreprocessing.Padding,
  apply: (x: tf.TensorContainer, task: Task) => {
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
  apply: (x: tf.TensorContainer, task: Task) => {
    const { xs, ys } = x as TextEntry
    const params = task.trainingInformation
    // TODO: add to task definition
    const tokenizer = (params as unknown as any).tokenizer

    let tokenized: number[]
    if (tokenizer === undefined) {
      tokenized = gpt3Tokenizer.encode(xs[0]).bpe
    } else {
      throw new Error('tokenizer not implemented')
    }

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
