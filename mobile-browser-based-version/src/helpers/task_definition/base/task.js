import * as tf from '@tensorflow/tfjs';
import * as memory from '../../memory/helpers.js';

/**
 * Reprents a TaskFrame containg relevant information about the task
 * for the Vue application.
 */
export class Task {
  constructor(taskID, displayInformation, trainingInformation) {
    this.taskID = taskID;
    this.displayInformation = displayInformation;
    this.trainingInformation = trainingInformation;
  }

  /**
   * 1. determine whether we should let the client handle model download
   * 2. should the server also propose an empty model (i.e. a json only)
   * to allow clients to start from scratch?
   */
  async createModel() {
    // To modularize
    let serverURL = process.env.VUE_APP_FEAI_SERVER;
    let newModel = await tf.loadLayersModel(
      serverURL.concat(`tasks/${this.taskID}/model.json`)
    );
    return newModel;
  }

  /**
   *
   * @returns the loaded working model from the memory
   */
  async getModelFromStorage() {
    return memory.getWorkingModel(
      this.taskID,
      this.trainingInformation.modelID
    );
  }
}
