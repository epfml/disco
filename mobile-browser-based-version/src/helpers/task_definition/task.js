import * as tf from '@tensorflow/tfjs';
import { memory } from '../memory/indexedb/memory.js';
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

  // Should not be here
  async getModelFromStorage() {
    return memory.getWorkingModel(
      this.taskID,
      this.trainingInformation.modelID
    );
    /*
    let savePath = 'indexeddb://working_'.concat(
      this.trainingInformation.modelID
    );
    let model = await tf.loadLayersModel(savePath);
    return model;*/
  }
}

/**
 * Abstract Class TaskHelpe.
 *
 * @class TaskHelper
 */
export class TaskHelper {
  constructor(task) {
    this.task = task;
    this.context = this.createContext();
  }
  dataPreprocessing(filesElement) {
    throw new Error("Method 'dataPreprocessing()' must be implemented.");
  }

  async predictionsToCsv(predictions) {
    throw new Error("Method 'predictionsToCsv()' must be implemented.");
  }

  createContext() {
    throw new Error("Method 'createContext()' must be implemented.");
  }
}
