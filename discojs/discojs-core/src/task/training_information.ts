import { Preprocessing } from '../dataset/data/preprocessing'
import { isModelCompileData, ModelCompileData } from './model_compile_data'

export function isTrainingInformation (raw: unknown): raw is TrainingInformation {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  type Fields =
    'dataType' |
    'scheme' |
    'epochs' |
    'roundDuration' |
    'validationSplit' |
    'batchSize' |
    'modelCompileData' |
    'modelID' |
    'preprocessingFunctions' |
    'inputColumns' |
    'outputColumns' |
    'IMAGE_H' |
    'IMAGE_W' |
    'learningRate' |
    'decentralizedSecure' |
    'maxShareValue' |
    'minimumReadyPeers' |
    'LABEL_LIST' |
    'noiseScale' |
    'clippingRadius'

  const {
    dataType,
    scheme,
    epochs,
    // roundDuration,
    validationSplit,
    batchSize,
    modelCompileData,
    modelID,
    preprocessingFunctions,
    inputColumns,
    outputColumns,
    IMAGE_H,
    IMAGE_W,
    learningRate,
    decentralizedSecure,
    maxShareValue,
    minimumReadyPeers,
    LABEL_LIST,
    noiseScale,
    clippingRadius
  } = raw as Record<Fields, unknown | undefined>

  if (
    typeof dataType !== 'string' ||
    typeof modelID !== 'string' ||
    typeof epochs !== 'number' ||
    typeof batchSize !== 'number' ||
    // typeof roundDuration !== 'number' ||
    typeof validationSplit !== 'number' ||
    (noiseScale !== undefined && typeof noiseScale !== 'number') ||
    (clippingRadius !== undefined && typeof clippingRadius !== 'number') ||
    (learningRate !== undefined && typeof learningRate !== 'number') ||
    (decentralizedSecure !== undefined && typeof decentralizedSecure !== 'boolean') ||
    (maxShareValue !== undefined && typeof maxShareValue !== 'number') ||
    (minimumReadyPeers !== undefined && typeof minimumReadyPeers !== 'number')
  ) {
    return false
  }

  // interdepences on data type
  switch (dataType) {
    case 'image':
      if (typeof IMAGE_H !== 'number' || typeof IMAGE_W !== 'number') {
        return false
      }
      break
    case 'tabular':
      if (!(Array.isArray(inputColumns) && inputColumns.every((e) => typeof e === 'string'))) {
        return false
      }
      if (!(Array.isArray(outputColumns) && outputColumns.every((e) => typeof e === 'string'))) {
        return false
      }
      break
  }

  // interdepences on scheme
  switch (scheme) {
    case 'decentralized':
      break
    case 'federated':
      break
    case 'local':
      break
  }

  if (!isModelCompileData(modelCompileData)) {
    return false
  }

  if (
    LABEL_LIST !== undefined && !(
      Array.isArray(LABEL_LIST) && LABEL_LIST.every((e) => typeof e === 'string')
    )
  ) {
    return false
  }

  if (
    preprocessingFunctions !== undefined && !(
      Array.isArray(preprocessingFunctions) && preprocessingFunctions.every((e) => typeof e === 'string')
    )
  ) {
    return false
  }

  return true
}

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
  preprocessingFunctions?: Preprocessing[]
  // modelCompileData: interface of additional training information (optimizer, loss and metrics)
  modelCompileData: ModelCompileData
  // dataType, e.g. image or tabular
  dataType: string
  // inputColumns: for tabular data, the columns to be chosen as input data for the model
  inputColumns?: string[]
  // outputColumns: for tabular data, the columns to be predicted by the model
  outputColumns?: string[]
  // IMAGE_H height of image (or RESIZED_IMAGE_H if ImagePreprocessing.Resize in preprocessingFunctions)
  IMAGE_H?: number
  // IMAGE_W width of image (or RESIZED_IMAGE_W if ImagePreprocessing.Resize in preprocessingFunctions)
  IMAGE_W?: number
  // LABEL_LIST of classes, e.g. if two class of images, one with dogs and one with cats, then we would
  // define ['dogs', 'cats'].
  LABEL_LIST?: string[]
  // learningRate: learning rate for the optimizer
  learningRate?: number
  // scheme: Distributed training scheme, i.e. Federated and Decentralized
  scheme: string
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
  // byzantineRobustAggregator: Byzantine robust aggregator on/off:
  // Boolean. true to use byzantine robust aggregation, if the training scheme is federated, false otherwise
  byzantineRobustAggregator?: boolean
  // tauPercentile: it indicates the percentile to take when choosing the tau for byzantine robust aggregator:
  // Number (>0 && <1). It must be a number between 0 and 1 and it is used only if byzantineRobustAggregator is true.
  tauPercentile?: number
  // maxShareValue: Secure Aggregation: maximum absolute value of a number in a randomly generated share
  // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
  // minimumReadyPeers: Decentralized Learning: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  minimumReadyPeers?: number
}
