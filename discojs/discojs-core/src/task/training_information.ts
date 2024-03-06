import type { AggregatorChoice } from '../aggregator/get'
import type { ImagePreprocessing, TabularPreprocessing, TextPreprocessing } from '../dataset/data/preprocessing'

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
    'modelID' |
    'preprocessingFunctions' |
    'inputColumns' |
    'outputColumns' |
    'IMAGE_H' |
    'IMAGE_W' |
    'decentralizedSecure' |
    'maxShareValue' |
    'minimumReadyPeers' |
    'LABEL_LIST' |
    'noiseScale' |
    'clippingRadius' |
    'aggregator'

  const {
    dataType,
    scheme,
    epochs,
    // roundDuration,
    validationSplit,
    batchSize,
    modelID,
    preprocessingFunctions,
    inputColumns,
    outputColumns,
    IMAGE_H,
    IMAGE_W,
    roundDuration,
    decentralizedSecure,
    maxShareValue,
    minimumReadyPeers,
    LABEL_LIST,
    noiseScale,
    clippingRadius,
    aggregator
  } = raw as Record<Fields, unknown | undefined>

  if (
    typeof dataType !== 'string' ||
    typeof modelID !== 'string' ||
    typeof epochs !== 'number' ||
    typeof batchSize !== 'number' ||
    typeof roundDuration !== 'number' ||
    typeof validationSplit !== 'number' ||
    (noiseScale !== undefined && typeof noiseScale !== 'number') ||
    (clippingRadius !== undefined && typeof clippingRadius !== 'number') ||
    (decentralizedSecure !== undefined && typeof decentralizedSecure !== 'boolean') ||
    (maxShareValue !== undefined && typeof maxShareValue !== 'number') ||
    (minimumReadyPeers !== undefined && typeof minimumReadyPeers !== 'number') ||
    (aggregator !== undefined && typeof aggregator !== 'number')
  ) {
    return false
  }

  // interdepences on data type
  if (dataType === 'image') {
    if (typeof IMAGE_H !== 'number' || typeof IMAGE_W !== 'number') {
      return false
    }
  } else if (dataType in ['text', 'tabular']) {
    if (!(Array.isArray(inputColumns) && inputColumns.every((e) => typeof e === 'string'))) {
      return false
    }
    if (!(Array.isArray(outputColumns) && outputColumns.every((e) => typeof e === 'string'))) {
      return false
    }
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

  if (
    LABEL_LIST !== undefined && !(
      Array.isArray(LABEL_LIST) && LABEL_LIST.every((e) => typeof e === 'string')
    )
  ) {
    return false
  }

  if (
    preprocessingFunctions !== undefined && !(Array.isArray(preprocessingFunctions))
  ) {
    return false
  }

  return true
}

export interface ImageConfig {
  type: 'image'

  // validationSplit: fraction of data to keep for validation, note this only works for image data
  validationSplit: number
  // IMAGE_H height of image (or RESIZED_IMAGE_H if ImagePreprocessing.Resize in preprocessingFunctions)
  IMAGE_H?: number
  // IMAGE_W width of image (or RESIZED_IMAGE_W if ImagePreprocessing.Resize in preprocessingFunctions)
  IMAGE_W?: number
  // LABEL_LIST of classes, e.g. if two class of images, one with dogs and one with cats, then we would
  // define ['dogs', 'cats'].
  LABEL_LIST?: string[]
  preprocessing: ImagePreprocessing[]
}

export interface TabularConfig {
  type: 'tabular'

  // inputColumns: for tabular data, the columns to be chosen as input data for the model
  inputColumns?: string[]
  // outputColumns: for tabular data, the columns to be predicted by the model
  outputColumns?: string[]
  preprocessing: TabularPreprocessing[]
}
export interface TextConfig {
  type: 'text'

  preprocessing: TextPreprocessing[]
}
export type DatasetConfigType = ImageConfig | TabularConfig | TextConfig

export interface TFJSModelConfig {
  type: 'tfjs'
}
export type ModelConfigType = TFJSModelConfig

export interface BaseNetworkConfig {
  type: NetworkConfigType['type']

  // noiseScale: Differential Privacy (DP): Affects the variance of the Gaussian noise added to the models / model updates.
  // Number or undefined. If undefined, then no noise will be added.
  // TODO unused
  noiseScale?: number
  // clippingRadius: Privacy (DP and Secure Aggregation):
  // Number or undefined. If undefined, then no model updates will be clipped.
  // If number, then model updates will be scaled down if their norm exceeds clippingRadius.
  // TODO unused
  clippingRadius?: number
  // aggregator:  aggregator to be used by the server for federated learning, or by the peers for decentralized learning
  // default is 'average', other options include for instance 'bandit'
  aggregator?: AggregatorChoice
}
export interface FederatedNetworkConfig extends BaseNetworkConfig {
  type: 'federated'

  // Byzantine robust aggregator on/off: undefined is off
  // TODO unused
  byzantineRobustAggregator?: {
    // tauPercentile: it indicates the percentile to take when choosing the tau for byzantine robust aggregator:
    // Number (>0 && <1). It must be a number between 0 and 1 and it is used only if byzantineRobustAggregator is true.
    tauPercentile: number // TODO rm
  }
}
export interface DecentralizedNetworkConfig extends BaseNetworkConfig {
  type: 'decentralized'

  // minimumReadyPeers: Decentralized Learning: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  minimumReadyPeers: number
  // Secure Aggregation on/off: undefined is off
  // TODO unused, replaced by aggregator choice
  decentralizedSecure?: {
    // maxShareValue: Secure Aggregation: maximum absolute value of a number in a randomly generated share
    // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
    // only relevant if secure aggregation is true (for either federated or decentralized learning)
    maxShareValue: number
  }
}
type NetworkConfigType = FederatedNetworkConfig | DecentralizedNetworkConfig

// TODO remove implicit types
// TODO rename to TrainingConfig?
export interface TrainingInformation<
  D extends DatasetConfigType | unknown = unknown,
  M extends ModelConfigType | unknown = unknown,
  N extends NetworkConfigType | BaseNetworkConfig = BaseNetworkConfig
> {
  // modelID: unique ID for the model
  modelID: string // TODO rm

  // epochs: number of epochs to run training for
  epochs: number
  // roundDuration: number of batches between each weight sharing round, e.g. if 3 then after every
  // 3 batches we share weights (in the distributed setting).
  roundDuration: number
  // batchSize: batch size of training data
  batchSize: number

  data: D
  model: M
  network: N // TODO renamed from scheme
}
