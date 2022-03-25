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
      const sampleTensor = preprocessData(
        dataset.arraySync()[i],
        trainingInformation
      )
      const labelTensor = _formatLabels(labels.arraySync()[i])
      yield { xs: sampleTensor, ys: labelTensor }
    }
  }
}

/**
 * Format the labels into a tensor and add a dimension if it has none
 * @param label
 * @returns
 */
function _formatLabels (label: any) {
  let tensor = tf.tensor(label)
  // If the label has no dimension, reshape it to have 1 dimension.
  if (tensor.shape.length === 0) {
    tensor = tf.tensor(label, [1])
  }
  return tensor
}
