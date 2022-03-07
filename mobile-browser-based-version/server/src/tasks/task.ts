class DataExample {
  columnName: string;
  columnData: string | number;
}

class ModelCompileData {
  optimizer: string
  loss: string
  metrics: string[]
}

class TrainingInformation {
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

class Task {
  taskID: string
  displayInformation?: DisplayInformation

  constructor (taskID: string) {
    this.taskID = taskID
  }
}

export {
  Task,
  DisplayInformation,
  ModelCompileData,
  TrainingInformation,
  DataExample
}
