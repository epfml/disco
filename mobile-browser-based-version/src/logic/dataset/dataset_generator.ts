import * as tf from '@tensorflow/tfjs'
import { preprocessData } from './preprocessing'
/**
 * Creates a dataset generator function for memory efficient training
 * @param {Array} dataset the dataset of the task
 * @param {Array} labels the labels of the task
 * @param {Integer} startIndex staring index of the split
 * @param {Integer} endIndex ending index of the split
 * @param {Array} transformationFunctions transformation functions to be applied to the data
 */
export function datasetGenerator (
  dataset,
  labels,
  startIndex,
  endIndex,
  trainingInformation
) {
  return function * dataGenerator () {
    for (let i = startIndex; i < endIndex; i++) {
      const tensor = preprocessData(
        dataset.arraySync()[i],
        trainingInformation
      )
      yield { xs: tensor, ys: tf.tensor(labels.arraySync()[i]) }
    }
  }
}
