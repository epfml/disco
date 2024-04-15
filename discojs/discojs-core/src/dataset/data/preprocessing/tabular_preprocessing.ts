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
    const entryContainer = await entry
    // if preprocessing a dataset without labels, then the entry is an array of numbers
    if (Array.isArray(entryContainer)) {
      const entry = entryContainer as number[]
      return entry.map((i: number) => i ?? 0)
      // if it is an object
    } else if (typeof entryContainer === 'object' && entry !== null) {
      // if the object is a tensor container with features xs and labels ys
      if (Object.hasOwn(entryContainer, 'xs')) {
        const { xs, ys } = entryContainer as TabularEntry
        return {
          xs: xs.map(i => i ?? 0),
          ys
        }
        // if the object contains features as a dict of feature names-values
      } else {
        const entry = Object.values(entryContainer)
        return entry.map((i: number) => i ?? 0)
      }
    } else {
      throw new Error('Unrecognized format during tabular preprocessing')
    }
  }
}

/**
 * Available tabular preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List([
  sanitize]
).sortBy((e) => e.type)
