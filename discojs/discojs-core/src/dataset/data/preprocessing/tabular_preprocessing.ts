import { Task, tf } from '../../..'
import { List } from 'immutable'
import { PreprocessingFunction } from './base'

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
  apply: (entry: tf.TensorContainer, task: Task): tf.TensorContainer => {
    // if preprocessing a dataset without labels, then the entry is an array of numbers
    if (entry instanceof Array ) {
      return entry.map(i => i === undefined ? 0 : i)
    // otherwise it is an object with feature and labels
    } else {
      const { xs, ys } = entry as TabularEntry
      return {
        xs: xs.map(i => i === undefined ? 0 : i),
        ys: ys
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
