/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
import * as tf from '@tensorflow/tfjs';
import path from 'path';

const INDEXEDDB_SCHEME = 'indexeddb://';
const DOWNLOADS_SCHEME = 'downloads://';
const WORKING_MODEL = 'working';
const SAVED_MODEL = 'saved';

async function _getModelMetadata(taskID, modelName, modelType) {
  let key = INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName));
  return await tf.io.listModels().then((models) => models[key] ?? false);
}

async function _getModel(taskID, modelName, modelType) {
  return await tf.loadLayersModel(
    INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  );
}

async function _deleteModel(taskID, modelName, modelType) {
  await tf.io.removeModel(
    INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  );
}


/**
 * Fetches metadata on the working model currently saved in IndexedDB.
 * Returns false if the specified model does not exist.
 * @param {String} taskID the working model's corresponding task
 * @param {String} modelName the working model's file name
 */
export async function getWorkingModelMetadata(taskID, modelName) {
  return await _getModelMetadata(taskID, modelName, WORKING_MODEL);
}

/**
 * Fetches metadata on a model saved to IndexedDB. Returns false if the
 * specified model does not exist.
 * @param {String} taskID the model's corresponding task
 * @param {String} modelName the model's file name
 */
export async function getSavedModelMetadata(taskID, modelName) {
  return await _getModelMetadata(taskID, modelName, SAVED_MODEL);
}

/**
 * Loads the current working model from IndexedDB and returns it as a fresh
 * TFJS object.
 * @param {String} taskID the working model's corresponding task
 * @param {String} modelName the working model's file name
 */
export async function getWorkingModel(taskID, modelName) {
  return await _getModel(taskID, modelName, WORKING_MODEL);
}

/**
 * Loads a previously saved model from IndexedDB and returns it as a fresh
 * TFJS object.
 * @param {String} taskID the saved model's corresponding task
 * @param {String} modelName the saved model's file name
 */
export async function getSavedModel(taskID, modelName) {
  return await _getModel(taskID, modelName, SAVED_MODEL);
}

/**
 * Loads a model from the model library into the current working model. This
 * means copying it from indexeddb://saved/ to indexeddb://workng/.
 * @param {String} taskID the saved model's corresponding task
 * @param {String} modelName the saved model's file name
 */
export async function loadSavedModel(taskID, modelName) {
  await tf.io.copyModel(
    INDEXEDDB_SCHEME.concat(path.join(SAVED_MODEL, taskID, modelName)),
    INDEXEDDB_SCHEME.concat(path.join(WORKING_MODEL, taskID, modelName))
  );
}

/**
 * Loads a fresh TFJS model object into the current working model in IndexedDB.
 * @param {String} taskID the working model's corresponding task
 * @param {String} modelName the working model's file name
 * @param {Object} model the fresh model
 */
export async function updateWorkingModel(taskID, modelName, model) {
  await model.save(
    INDEXEDDB_SCHEME.concat(path.join(WORKING_MODEL, taskID, modelName))
  );
}

/**
 * Adds the current working model to the model library. This means copying it
 * from indexeddb://working/ to indexeddb://saved/.
 * @param {String} taskID the working model's corresponding task
 * @param {String} modelName the working model's file name
 */
export async function saveWorkingModel(taskID, modelName) {
  await tf.io.copyModel(
    INDEXEDDB_SCHEME.concat(path.join(WORKING_MODEL, taskID, modelName)),
    INDEXEDDB_SCHEME.concat(path.join(SAVED_MODEL, taskID, modelName))
  );
}

/**
 * Removes the working model model from IndexedDB.
 * @param {String} taskID the model's corresponding task
 * @param {String} modelName the model's file name
 */
export async function deleteWorkingModel(taskID, modelName) {
  await _deleteModel(taskID, modelName, WORKING_MODEL);
}

/**
 * Remove a previously saved model from IndexedDB.
 * @param {String} taskID the model's corresponding task
 * @param {String} modelName the model's file name
 */
export async function deleteSavedModel(taskID, modelName) {
  await _deleteModel(taskID, modelName, SAVED_MODEL);
}

/**
 * Downloads a previously saved model.
 * @param {String} taskID the saved model's corresponding task
 * @param {String} modelName the saved model's file name
 */
export async function downloadSavedModel(taskID, modelName) {
  await tf.io.copyModel(
    INDEXEDDB_SCHEME.concat(path.join(SAVED_MODEL, taskID, modelName)),
    DOWNLOADS_SCHEME.concat(`${taskID}_${modelName}`)
  );
}
/**
 * Preprocesses the data based on the training information
 * @param {Array} data the dataset of the task
 * @param {Object} trainingInformation the training information of the task
 */
export function preprocessData(data, trainingInformation) {
  var tensor = data;
  //More preprocessing functions can be added using this template
  if (trainingInformation.preprocessFunctions.includes('resize')) {
    tensor = tf.image.resizeBilinear(tensor, [
      trainingInformation.RESIZED_IMAGE_H,
      trainingInformation.RESIZED_IMAGE_W,
    ]);
  }

  return tensor;
}
/**
 * Creates a dataset generator function for memory efficient training
 * @param {Array} dataset the dataset of the task
 * @param {Array} labels the labels of the task
 * @param {Integer} startIndex staring index of the split
 * @param {Integer} endIndex ending index of the split
 * @param {Array} transformationFunctions transformation functions to be applied to the data
 */
export function datasetGenerator(
  dataset,
  labels,
  startIndex,
  endIndex,
  trainingInformation
) {
  return function* dataGenerator() {
    for (let i = startIndex; i < endIndex; i++) {
      const tensor = preprocessData(dataset.arraySync()[i], trainingInformation)
      yield { xs: tensor, ys: tf.tensor(labels.arraySync()[i]) };
    }
  };
}
