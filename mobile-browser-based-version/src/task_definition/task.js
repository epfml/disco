import * as tf from '@tensorflow/tfjs';

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
    let serverURL = process.env.VUE_APP_DEAI_SERVER;
    let newModel = await tf.loadLayersModel(
      serverURL.concat(`tasks/${this.taskID}/model.json`)
    );
    return newModel;
  }

  // Should not be here
  async getModelFromStorage() {
    let savePath = 'indexeddb://working_'.concat(
      this.trainingInformation.modelID
    );
    let model = await tf.loadLayersModel(savePath);
    return model;
  }
}
