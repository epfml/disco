import * as tf from '@tensorflow/tfjs'

import { TaskID } from '..'
import { ModelType } from './model_type'

export abstract class Memory {
  /**
  * Fetches metadata of the model.
  * @param taskID the working model's corresponding task
  * @param modelName the working model's file name
  */
  abstract getModelMetadata (type: ModelType, taskID: TaskID, modelName: string): Promise<tf.io.ModelArtifactsInfo | undefined>

  /**
  * Loads the current working model and returns it as a fresh TFJS object.
  * @param taskID the working model's corresponding task
  * @param modelName the working model's file name
  */
  abstract getModel (type: ModelType, taskID: TaskID, modelName: string): Promise<tf.LayersModel>

  /**
 * Loads a model from the model library into the current working model.
 * @param taskID the saved model's corresponding task
 * @param modelName the saved model's file name
 */
  abstract loadSavedModel (taskID: TaskID, modelName: string): Promise<void>

  /**
 * Loads a fresh TFJS model object into the current working model.
 * @param taskID the working model's corresponding task
 * @param modelName the working model's file name
 * @param model the fresh model
 */
  abstract updateWorkingModel (taskID: TaskID, modelName: string, model: tf.LayersModel): Promise<void>

  /**
 * Adds the current working model to the model library.
 * @param taskID the working model's corresponding task
 * @param modelName the working model's file name
 */
  abstract saveWorkingModel (taskID: TaskID, modelName: string): Promise<void>

  /**
 * Removes the model from the library.
 * @param taskID the model's corresponding task
 * @param modelName the model's file name
 */
  abstract deleteModel (type: ModelType, taskID: TaskID, modelName: string): Promise<void>

  /**
 * Downloads a previously saved model.
 * @param String} taskID the saved model's corresponding task
 * @param String} modelName the saved model's file name
 */
  abstract downloadSavedModel (taskID: TaskID, modelName: string): Promise<void>
}
