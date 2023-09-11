import { Data } from './data'
import { Dataset } from '../dataset'

/**
 * Train-validation split of Disco data.
 */
export interface DataSplit {
  train: Data
  validation?: Data
}

export function extract (data: DataSplit): {training: Dataset, validation: Dataset} {
  const training = data.train.preprocess().batch().dataset
  return {
    training,
    validation: data.validation?.preprocess().batch().dataset ?? training
  }
}
