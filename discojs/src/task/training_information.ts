import { DataExample } from './data_example'
import { ModelCompileData } from './model_compile_data'
import { ImagePreprocessing } from '../dataset/preprocessing'
import { TrainingSchemes } from '../training/training_schemes'

export interface TrainingInformation {
  modelID: string
  epochs: number
  roundDuration: number
  validationSplit: number
  learningRate?: number
  batchSize: number
  modelCompileData: ModelCompileData
  // TODO: Move to TabularInformation
  inputColumns?: string[]
  outputColumns?: string[]
  LABEL_LIST?: string[]
}

export interface DifferentialPrivacy {
  noiseScale?: number
  clippingRadius?: number
}

export type ClientInformation = FederatedInformation | DecentralizedInformation | LocalInformation

export interface FederatedInformation {
  scheme: TrainingSchemes.FEDERATED
  differentialPrivacy?: DifferentialPrivacy
}

export interface LocalInformation {
  scheme: TrainingSchemes.LOCAL
}

export interface DecentralizedInformation {
  scheme: TrainingSchemes.DECENTRALIZED
  differentialPrivacy?: DifferentialPrivacy
  receivedMessagesThreshold?: number
  // maximum absolute value of a number in a randomly generated share for secure aggregation
  // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
  // minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  // only relevant in decentralized setting
  minimumReadyPeers?: number
  // true if the training scheme is decentralized and requires secure aggregation, false otherwise
  decentralizedSecure?: boolean
}

export type DataInformation = ImageInformation | TabularInformation

export enum DataType {
  IMAGE = 'image',
  TABULAR = 'tabular'
}

export interface ImageInformation {
  type: DataType.IMAGE
  IMAGE_H?: number
  IMAGE_W?: number
  RESIZED_IMAGE_H?: number
  RESIZED_IMAGE_W?: number
  csvLabels?: boolean
  aggregateImagesById?: boolean
  NUM_CLASSES?: number
  LABEL_ASSIGNMENT?: DataExample[]
  preprocessingFunctions: ImagePreprocessing[]
}

export interface TabularInformation {
  type: DataType.TABULAR
}
