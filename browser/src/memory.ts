/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
import * as tf from '@tensorflow/tfjs'
import path from 'path'

import { Memory, ModelType } from 'discojs'

export type Path = string

export function pathFor (type: ModelType, taskID: string, modelName: string): Path {
  return `indexeddb://${path.join(type, taskID, modelName)}`
}

export class IndexedDB extends Memory {
  async getModelMetadata (type: ModelType, taskID: string, modelName: string): Promise<tf.io.ModelArtifactsInfo | undefined> {
    const key = pathFor(type, taskID, modelName)
    const models = await tf.io.listModels()

    return models[key]
  }

  async contains (type: ModelType, taskID: string, modelName: string): Promise<boolean> {
    return await this.getModelMetadata(type, taskID, modelName) !== undefined
  }

  async getModel (type: ModelType, taskID: string, modelName: string): Promise<tf.LayersModel> {
    return await tf.loadLayersModel(pathFor(type, taskID, modelName))
  }

  async deleteModel (type: ModelType, taskID: string, modelName: string): Promise<void> {
    await tf.io.removeModel(pathFor(type, taskID, modelName))
  }

  async loadSavedModel (taskID: string, modelName: string): Promise<void> {
    await tf.io.copyModel(
      pathFor(ModelType.SAVED, taskID, modelName),
      pathFor(ModelType.WORKING, taskID, modelName)
    )
  }

  /**
 * Loads a fresh TFJS model object into the current working model in IndexedDB.
 * @param {String} taskID the working model's corresponding task
 * @param {String} modelName the working model's file name
 * @param {Object} model the fresh model
 */
  async updateWorkingModel (taskID: string, modelName: string, model: tf.LayersModel): Promise<void> {
    await model.save(pathFor(ModelType.WORKING, taskID, modelName))
  }

  /**
 * Adds the current working model to the model library. This means copying it
 * from indexeddb://working/ to indexeddb://saved/.
 * @param {String} taskID the working model's corresponding task
 * @param {String} modelName the working model's file name
 */
  async saveWorkingModel (taskID: string, modelName: string): Promise<void> {
    await tf.io.copyModel(
      pathFor(ModelType.WORKING, taskID, modelName),
      pathFor(ModelType.SAVED, taskID, modelName)
    )
  }

  /**
 * Downloads a previously saved model.
 * @param {String} taskID the saved model's corresponding task
 * @param {String} modelName the saved model's file name
 */
  async downloadSavedModel (taskID: string, modelName: string): Promise<void> {
    await tf.io.copyModel(
      pathFor(ModelType.SAVED, taskID, modelName),
      `downloads://${taskID}_${modelName}`
    )
  }
}
