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
  // decentralizedSecure: true if the training scheme is decentralized and requires secure aggregation, false otherwise
  decentralizedSecure?: boolean
  // minimumReadyPeers: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  // only relevant in decentralized setting
  minimumReadyPeers?: number
  // maxShareValue: maximum absolute value of a number in a randomly generated share for secure aggregation
  // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
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
  // noiseScale: Affects the variance of the Gaussian noise added to the models / model updates for differential privacy.
  scheme?: string
  noiseScale?: number
  clippingRadius?: number
}
