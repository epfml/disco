import { DataExample } from './data_example'
import { ModelCompileData } from './model_compile_data'

export interface TrainingInformation {
  modelID: string
  epochs: number
  roundDuration: number
  validationSplit: number
  batchSize: number
  preprocessFunctions: string[]
  modelCompileData: ModelCompileData
  dataType: string
  maxShareValue?: number
  minimumReadyPeers?: number
  decentralizedSecure?: boolean
  receivedMessagesThreshold?: number
  inputColumns?: string[]
  outputColumns?: string[]
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
  scheme?: string
  noiseScale?: number
  clippingRadius?: number
}
