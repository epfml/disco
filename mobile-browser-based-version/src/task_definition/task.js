import * as tf from '@tensorflow/tfjs';

export class Task {
  constructor(taskID, displayInformation, trainingInformation) {
    this.taskID = taskID;
    this.displayInformation = displayInformation;
    this.trainingInformation = trainingInformation;
  }

  async createModel() {
    let serverURL = process.env.VUE_APP_SERVER_URI;
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
