import type tf from '@tensorflow/tfjs'
import { List } from 'immutable'

import type { PreprocessingFunction } from './base.js'

/**
 * Available tabular preprocessing types.
 */
export enum TabularPreprocessing {
  Sanitize,
  Normalize
}

interface TabularEntry extends tf.TensorContainerObject {
  xs: number[]
  ys: tf.Tensor1D | number | undefined
}

const sanitize: PreprocessingFunction = {
  type: TabularPreprocessing.Sanitize,
  apply: async (entry: Promise<tf.TensorContainer>) => {
    // if preprocessing a dataset without labels, then the entry is an array of numbers
    if (Array.isArray(entry)) {
      return entry.map((i: number) => i ?? 0)
    // otherwise it is an object with feature and labels
    } else {
      const { xs, ys } = await entry as TabularEntry
      return {
        xs: xs.map(i => i ?? 0),
        ys
      }
    }
  }
}

/**
 * Available tabular preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List([
  sanitize]
).sortBy((e) => e.type)
