import { List } from 'immutable'
import { PreprocessingFunction } from './base'

export enum TabularPreprocessing {
  Sanitize,
  Normalize
}

export const AVAILABLE_PREPROCESSING = List<PreprocessingFunction>()
