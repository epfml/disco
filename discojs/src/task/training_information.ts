import { ModelCompileData } from './model_compile_data'
import { Preprocessing } from '../dataset/preprocessing'

export interface TrainingInformation {
  // modelID: unique ID for the model
  modelID: string
  // epochs: number of epochs to run training for
  epochs: number
  // roundDuration: number of batches between each weight sharing round, e.g. if 3 then after every
  // 3 batches we share weights (in the distributed setting).
  roundDuration: number
  // validationSplit: fraction of data to keep for validation, note this only works for image data
  validationSplit: number
  // batchSize: batch size of training data
  batchSize: number
  // preprocessingFunctions: preprocessing functions such as resize and normalize
  preprocessingFunctions: Preprocessing[]
  // modelCompileData: interface of additional training information (optimizer, loss and metrics)
  modelCompileData: ModelCompileData
  // dataType, e.g. image or tabular
  dataType: string
  // inputColumns: for tabular data, the columns to be chosen as input data for the model
  inputColumns?: string[]
  // outputColumns: for tabular data, the columns to be predicted by the model
  outputColumns?: string[]
  // IMAGE_H height of image
  IMAGE_H?: number
  // IMAGE_W width of image
  IMAGE_W?: number
  // LABEL_LIST of classes, e.g. if two class of images, one with dogs and one with cats, then we would
  // define ['dogs', 'cats'].
  LABEL_LIST?: string[]
  // learningRate: learning rate for the optimizer
  learningRate?: number
  // RESIZED_IMAGE_H: New image width, note that you must add ImagePreprocessing.Resize in the preprocessingFunctions.
  RESIZED_IMAGE_H?: number // TODO: regroup image vs csv specific stuff?
  // RESIZED_IMAGE_W: New image width, note that you must add ImagePreprocessing.Resize in the preprocessingFunctions.
  RESIZED_IMAGE_W?: number
  // scheme: Distributed training scheme, i.e. Federated and Decentralized
  scheme?: string
  // noiseScale: Differential Privacy (DP): Affects the variance of the Gaussian noise added to the models / model updates.
  // Number or undefined. If undefined, then no noise will be added.
  noiseScale?: number
  // clippingRadius: Privacy (DP and Secure Aggregation):
  // Number or undefined. If undefined, then no model updates will be clipped.
  // If number, then model updates will be scaled down if their norm exceeds clippingRadius.
  clippingRadius?: number
  // decentralizedSecure: Secure Aggregation on/off:
  // Boolean. true for secure aggregation to be used, if the training scheme is decentralized, false otherwise
  decentralizedSecure?: boolean
  // maxShareValue: Secure Aggregation: maximum absolute value of a number in a randomly generated share
  // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
  // minimumReadyPeers: Decentralized Learning: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  minimumReadyPeers?: number
}
