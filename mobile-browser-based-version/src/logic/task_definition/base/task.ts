import * as tf from '@tensorflow/tfjs'
import * as memory from '../../memory/model_io'

class DataExample {
  columnName: string;
  columnData: string | number;
}

class ModelCompileData {
  optimizer: string
  loss: string
  metrics: string[]
}

export class TrainingInformation {
  modelID: string
  epochs: number
  roundDuration: number
  validationSplit: number
  batchSize: number
  preprocessFunctions: string[]
  modelCompileData: ModelCompileData
  receivedMessagesThreshold?: number
  dataType: string
  inputColumns?: string[]
  outputColumn?: string
  threshold?: number
  IMAGE_H?: number
  IMAGE_W?: number
  LABEL_LIST?: string[]
  aggregateImagesById?: boolean
  learningRate?: number
  NUM_CLASSES?: number
  csvLabels?: boolean
  RESIZED_IMAGE_H?: number
  RESIZED_IMAGE_W?: number
  LABEL_ASSIGNMENT?: DataExample[]
}

class DisplayInformation {
  taskTitle: string
  summary: string
  overview: string
  model?: string
  tradeoffs: string
  dataFormatInformation: string
  dataExampleText: string
  dataExample?: DataExample[]
  headers?: string[]
  dataExampleImage?: string
  limitations?: string
}

/**
 * Reprents a TaskFrame containg relevant information about the task
 * for the Vue application.
 */
type FileEvent = { target: { result: string } };

export abstract class Task {
  taskID: string;
  displayInformation: DisplayInformation;
  trainingInformation: TrainingInformation;
  constructor (taskID, displayInformation, trainingInformation) {
    this.taskID = taskID
    this.displayInformation = displayInformation
    this.trainingInformation = trainingInformation
  }

  /**
   * 1. determine whether we should let the client handle model download
   * 2. should the server also propose an empty model (i.e. a json only)
   * to allow clients to start from scratch?
   */
  async createModel () {
    // To modularize
    const serverURL = process.env.VUE_APP_FEAI_SERVER
    const newModel = await tf.loadLayersModel(
      serverURL.concat(`tasks/${this.taskID}/model.json`)
    )
    return newModel
  }

  /**
   *
   * @returns the loaded working model from the memory
   */
  async getModelFromStorage () {
    return memory.getWorkingModel(
      this.taskID,
      this.trainingInformation.modelID
    )
  }

  /**
   * Abstract methods
   */
  abstract dataPreprocessing(filesElement: any): Promise<{ accepted: Boolean, Xtrain: any, ytrain: any }>;
  abstract predict(filesElement: FileEvent);
}

// context => goes there
