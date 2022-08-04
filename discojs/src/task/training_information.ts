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
  receivedMessagesThreshold?: number // TODO: explain, rename or remove
  inputColumns?: string[]
  outputColumns?: string[]
  threshold?: number // TODO: explain, rename or remove
  IMAGE_H?: number
  IMAGE_W?: number
  LABEL_LIST?: string[]
  aggregateImagesById?: boolean
  learningRate?: number
  NUM_CLASSES?: number
  csvLabels?: boolean
  RESIZED_IMAGE_H?: number // TODO: regroup image vs csv specific stuff?
  RESIZED_IMAGE_W?: number
  LABEL_ASSIGNMENT?: DataExample[]
  scheme?: string
  // noiseScale: Differential Privacy: Affects the variance of the Gaussian noise added to the models / model updates.
  noiseScale?: number
  // clippingRadius: Differential Privacy: Clipping can be user for both differential privacy and for secure aggregation.
  // Model updates will be scaled down if their norm exceeds clippingRadius.
  clippingRadius?: number
  // decentralizedSecure: Secure Aggregation on/off: true for secure aggregation to be user, if the training scheme is decentralized, false otherwise
  decentralizedSecure?: boolean
  // minimumReadyPeers: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  // only relevant in decentralized setting
  minimumReadyPeers?: number
  // maxShareValue: Secure Aggregation: maximum absolute value of a number in a randomly generated share
  // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
}
