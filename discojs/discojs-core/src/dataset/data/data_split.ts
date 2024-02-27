import { type Data } from './data'

/**
 * Train-validation split of Disco data.
 */
export interface DataSplit {
  train: Data
  validation?: Data
}
