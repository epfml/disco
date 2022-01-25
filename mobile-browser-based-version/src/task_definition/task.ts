import * as tf from '@tensorflow/tfjs'

export class Task {
  taskID: string;
  displayInformation: any;
  trainingInformation: any;
  constructor(taskID, displayInformation, trainingInformation) {
    this.taskID = taskID
    this.displayInformation = displayInformation
    this.trainingInformation = trainingInformation
  }

  /**
   * 1. determine whether we should let the client handle model download
   * 2. should the server also propose an empty model (i.e. a json only)
   * to allow clients to start from scratch?
   */
  async createModel() {
    // To modularize
    const serverURL = process.env.VUE_APP_FEAI_SERVER
    const newModel = await tf.loadLayersModel(
      serverURL.concat(`tasks/${this.taskID}/model.json`)
    )
    return newModel
  }

  // Should not be here
  async getModelFromStorage() {
    const savePath = 'indexeddb://working_'.concat(
      this.trainingInformation.modelID
    )
    const model = await tf.loadLayersModel(savePath)
    return model
  }
}
