import * as tf from '@tensorflow/tfjs'

function _preprocessDataWithResize (trainingInformation) {
  return trainingInformation.preprocessFunctions.includes('resize')
}

/**
 * Preprocesses the data based on the training information
 * @param {Array} data the dataset of the task
 * @param {Object} trainingInformation the training information of the task
 */
export function preprocessData (data, trainingInformation) {
  let tensor = data
  // More preprocessing functions can be added using this template
  if (_preprocessDataWithResize(trainingInformation)) {
    tensor = tf.image.resizeBilinear(tensor, [
      trainingInformation.RESIZED_IMAGE_H,
      trainingInformation.RESIZED_IMAGE_W
    ])
  } else {
    tensor = tf.tensor(data)
  }

  return tensor
}
