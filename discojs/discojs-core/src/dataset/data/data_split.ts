import { Data } from './data'
import { Dataset } from '../dataset'

/**
 * Train-validation split of Disco data.
 */
export interface DataSplit {
  train: Data
  validation?: Data
}

/**
 * Extracts the training and validation sets from a data split object.
 * The returned datasets are preprocessed and batched.
 * @param data The data split
 * @returns A tuple object containing the training and validation datasets
 */
export function extract (data: DataSplit): {training: Dataset, validation: Dataset} {
  const training = data.train.preprocess().batch().dataset
  const validation = data.validation?.preprocess().batch().dataset ?? training
  return { training, validation }
}
