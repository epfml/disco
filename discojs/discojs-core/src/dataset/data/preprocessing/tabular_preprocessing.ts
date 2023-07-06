import { List } from 'immutable'
import { PreprocessingFunction } from './base'

/**
 * Available tabular preprocessing types.
 */
export enum TabularPreprocessing {
  Sanitize,
  Normalize
}

/**
 * Available tabular preprocessing functions.
 */
export const AVAILABLE_PREPROCESSING = List<PreprocessingFunction>()
