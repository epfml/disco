import type { Data } from './data.js'

/**
 * Train-validation split of Disco data.
 */
export interface DataSplit {
  train: Data
  validation?: Data
}
