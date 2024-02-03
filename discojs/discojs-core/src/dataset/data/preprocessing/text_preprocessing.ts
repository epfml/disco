import { Task, tf } from '../../..'
import { PreprocessingFunction } from './base'

import defaultTokenizer from 'gpt-tokenizer/model/text-davinci-003'
import { List } from 'immutable'

/**
 * Available text preprocessing types.
 */
export enum TextPreprocessing {
    Tokenize,
    Padding,
}

interface TextEntry extends tf.TensorContainerObject {
    xs: string[]
    ys: number[]
}

interface TokenizedEntry extends tf.TensorContainerObject {
    xs: tf.Tensor1D
    ys: tf.Tensor1D
}

const padding: PreprocessingFunction = {
    type: TextPreprocessing.Padding,
    apply: (x: tf.TensorContainer, task: Task) => {
        const { xs, ys } = x as TokenizedEntry
        const params = task.trainingInformation
        const maxLength = params.blockSize || 64
        // FIXME: Not sure you would want an undefined maxLength
        // if (maxLength === undefined) {
        //     return { xs, ys }
        // }
        return {
            xs: xs
                .pad([[0, Math.max(0, maxLength - xs.size)]])
                .slice([0], [maxLength]),
            ys,
        }
    },
}

const tokenize: PreprocessingFunction = {
    type: TextPreprocessing.Tokenize,
    apply: (x: tf.TensorContainer, task: Task) => {
        const { xs, ys } = x as TextEntry
        const params = task.trainingInformation
        const tokenizer = params.tokenizer || defaultTokenizer
        const tokenized = tokenizer.encode(xs[0])

        return {
            xs: tf.tensor(tokenized),
            ys: tf.tensor(ys),
        }
    },
}

/**
 * Available text preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List.of(tokenize, padding).sortBy(
    (e) => e.type
)
