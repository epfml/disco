/**
 * Helper functions used to load and save TF.js models from IndexedDB.
 * The working model is the model currently being trained for a task.
 * Saved models are models that were explicitly saved to IndexedDB.
 * The corresponding working/ and saved/ folders live in IndexedDB and
 * are invisible to the user. The user only interacts with the saved/
 * folder via the model library and a few other UI components. The
 * working/ folder is only used by the web app's backend. The working
 * model is loaded from IndexedDB for training (model.fit) only.
 */
import * as tf from '@tensorflow/tfjs'
import path from 'path'

const INDEXEDDB_SCHEME = 'indexeddb://'
const DOWNLOADS_SCHEME = 'downloads://'
const WORKING_MODEL = 'working'
const SAVED_MODEL = 'saved'

/**
* Helper function returning the given model's metadata as stored in IndexedDB.
* If the model is not available in IndexedDB, returns false.
* @param {string} taskID The task's ID
* @param {string} modelName The model's file name
* @param {string} modelType The model's type (working, saved)
* @returns {Array} Returns the model's metadata. If the model does not exist in IndexedDB, returns false.
*/
async function _getModelMetadata (taskID, modelName, modelType) {
  const key = INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  return await tf.io.listModels().then((models) => models[key] ?? false)
}

/**
* Helper function returning the TF.js model corresponding to the specified task,
* model file name and model type (working, saved).
* @param {string} taskID The task's ID
* @param {string} modelName The model's file name
* @param {string} modelType The model's type (working, saved)
* @returns {any} The TF.js model
*/
async function _getModel (taskID, modelName, modelType) {
  return await tf.loadLayersModel(
    INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  )
}

/**
* Helper function removing the model from IndexedDB, corresponding to the specified task,
* model file name and model type (working, saved).
* @param {string} taskID The task's ID
* @param {string} modelName The model's file name
* @param {string} modelType The model's type (working, saved)
*/
async function _deleteModel (taskID, modelName, modelType) {
  await tf.io.removeModel(
    INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  )
}

function _preprocessDataWithResize (trainingInformation) {
  return trainingInformation.preprocessFunctions.includes('resize')
}

/**
* Returns metadata on the working model currently saved in IndexedDB.
* Returns false if the specified model does not exist in IndexedDB.
* @param {string} taskID The working model's corresponding task ID
* @param {string} modelName The working model's file name
* @returns {Array} Returns the model's metadata. If the model does not exist in IndexedDB, returns false.
*/
export async function getWorkingModelMetadata (taskID, modelName) {
  return await _getModelMetadata(taskID, modelName, WORKING_MODEL)
}

/**
* Returns metadata on a model saved to IndexedDB. Returns false if the
* specified model does not exist in IndexedDB.
* @param {string} taskID The model's corresponding task
* @param {string} modelName The model's file name
* @returns {Array} Returns the model's metadata. If the model does not exist in IndexedDB, returns false.
*/
export async function getSavedModelMetadata (taskID, modelName) {
  return await _getModelMetadata(taskID, modelName, SAVED_MODEL)
}

/**
* Loads the current working model from IndexedDB and returns it as a fresh
* TF.js any.
* @param {string} taskID The working model's corresponding task
* @param {string} modelName The working model's file name
* @returns {any} The TF.js model
*/
export async function getWorkingModel (taskID, modelName) {
  return await _getModel(taskID, modelName, WORKING_MODEL)
}

/**
* Loads a previously saved model from IndexedDB and returns it as a fresh
* TFJS any.
* @param {string} taskID The saved model's corresponding task
* @param {string} modelName The saved model's file name
* @returns {any} The TF.js model
*/
export async function getSavedModel (taskID, modelName) {
  return await _getModel(taskID, modelName, SAVED_MODEL)
}

/**
* Loads a model from the model library into the current working model. This
* means copying it from indexeddb://saved/ to indexeddb://workng/.
* @param {string} taskID The saved model's corresponding task
* @param {string} modelName The saved model's file name
* @returns {any} The TF.js model
*/
export async function loadSavedModel (taskID, modelName) {
  await tf.io.copyModel(
    INDEXEDDB_SCHEME.concat(path.join(SAVED_MODEL, taskID, modelName)),
    INDEXEDDB_SCHEME.concat(path.join(WORKING_MODEL, taskID, modelName))
  )
}

/**
* Saves a fresh TF.js model any into the current working model in IndexedDB.
* @param {string} taskID The working model's corresponding task
* @param {string} modelName The working model's file name
* @param {any} model The TF.js model
*/
export async function updateWorkingModel (taskID, modelName, model) {
  await model.save(
    INDEXEDDB_SCHEME.concat(path.join(WORKING_MODEL, taskID, modelName))
  )
}

/**
* Adds the current working model to the model library. This means copying it
* from indexeddb://working/ to indexeddb://saved/, thus making it available
* as a saved model.
* @param {string} taskID The working model's corresponding task
* @param {string} modelName The working model's file name
*/
export async function saveWorkingModel (taskID, modelName) {
  await tf.io.copyModel(
    INDEXEDDB_SCHEME.concat(path.join(WORKING_MODEL, taskID, modelName)),
    INDEXEDDB_SCHEME.concat(path.join(SAVED_MODEL, taskID, modelName))
  )
}

/**
* Removes the specified working model from IndexedDB.
* @param {string} taskID The model's corresponding task
* @param {string} modelName The model's file name
*/
export async function deleteWorkingModel (taskID, modelName) {
  await _deleteModel(taskID, modelName, WORKING_MODEL)
}

/**
* Remove the specified saved model from IndexedDB.
* @param {string} taskID The model's corresponding task
* @param {string} modelName The model's file name
*/
export async function deleteSavedModel (taskID, modelName) {
  await _deleteModel(taskID, modelName, SAVED_MODEL)
}

/**
* Downloads the specified saved model to the client's local storage.
* @param {string} taskID The saved model's corresponding task
* @param {string} modelName The saved model's file name
*/
export async function downloadSavedModel (taskID, modelName) {
  await tf.io.copyModel(
    INDEXEDDB_SCHEME.concat(path.join(SAVED_MODEL, taskID, modelName)),
    DOWNLOADS_SCHEME.concat(`${taskID}_${modelName}`)
  )
}
/**
* Preprocesses the data based on the training information
* @param {Array} data the dataset of the task
* @param {any} trainingInformation the training information of the task
*/
export function preprocessData (data, trainingInformation) {
  let tensor = data
  // More preprocessing functions can be added using this template
  if (_preprocessDataWithResize(trainingInformation)) {
    tensor = tf.image.resizeBilinear(tensor, [
      trainingInformation.RESIZED_IMAGE_H,
      trainingInformation.RESIZED_IMAGE_W
    ])
  }

  return tensor
}
/**
* Creates a dataset generator function for memory efficient training
* @param {Array} dataset the dataset of the task
* @param {Array} labels the labels of the task
* @param {number} startIndex staring index of the split
* @param {number} endIndex ending index of the split
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
