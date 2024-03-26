import type { AggregatorChoice } from '../aggregator/get.js'
import type { Preprocessing } from '../dataset/data/preprocessing/index.js'

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
  // scheme: Distributed training scheme, i.e. Federated and Decentralized
  scheme: 'decentralized' | 'federated' | 'local'
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
  // default is 100, must be a positive number, check the docs/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
  // minimumReadyPeers: Decentralized Learning: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  minimumReadyPeers?: number
  // aggregator:  aggregator to be used by the server for federated learning, or by the peers for decentralized learning
  // default is 'average', other options include for instance 'bandit'
  aggregator?: AggregatorChoice
  // tokenizerName (string). For example: 'Xenova/gpt2'. The name should match a Transformers.js tokenizer available on HuggingFace's hub. 
  tokenizerName?: string
  // tokenizer (object). The actual tokenizer. It is initialized according to the tokenizerName the first time it is needed for the subsequent tokenizations
  // This field is not expected to be filled when initializing a field
  tokenizer?: object
  // maxSequenceLength: the maximum length of a input string used as input to a GPT model. It is used during preprocessing to
  // truncate strings to a maximum length. The default value is tokenizer.model_max_length
  maxSequenceLength?: number
}

function isStringArray(raw: unknown): raw is string[] {
  if (!Array.isArray(raw)) {
    return false
  }
  const arr: unknown[] = raw // isArray is unsafely guarding with any[]

  return arr.every((e) => typeof e === 'string')
}

export function isTrainingInformation (raw: unknown): raw is TrainingInformation {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const {
    IMAGE_H,
    IMAGE_W,
    LABEL_LIST,
    aggregator,
    batchSize,
    byzantineRobustAggregator,
    clippingRadius,
    dataType,
    decentralizedSecure,
    epochs,
    inputColumns,
    maxShareValue,
    minimumReadyPeers,
    modelID,
    noiseScale,
    outputColumns,
    preprocessingFunctions,
    roundDuration,
    scheme,
    tauPercentile,
    validationSplit,
  }: Partial<Record<keyof TrainingInformation, unknown>> = raw

  if (
    typeof dataType !== 'string' ||
    typeof modelID !== 'string' ||
    typeof epochs !== 'number' ||
    typeof batchSize !== 'number' ||
    typeof roundDuration !== 'number' ||
    typeof validationSplit !== 'number' ||
    (aggregator !== undefined && typeof aggregator !== 'number') ||
    (clippingRadius !== undefined && typeof clippingRadius !== 'number') ||
    (decentralizedSecure !== undefined && typeof decentralizedSecure !== 'boolean') ||
    (byzantineRobustAggregator !== undefined && typeof byzantineRobustAggregator !== 'boolean') ||
    (maxShareValue !== undefined && typeof maxShareValue !== 'number') ||
    (minimumReadyPeers !== undefined && typeof minimumReadyPeers !== 'number') ||
    (noiseScale !== undefined && typeof noiseScale !== 'number') ||
    (tauPercentile !== undefined && typeof tauPercentile !== 'number') ||
    (IMAGE_H !== undefined && typeof IMAGE_H !== 'number') ||
    (IMAGE_W !== undefined && typeof IMAGE_W !== 'number') ||
    (LABEL_LIST !== undefined && !isStringArray(LABEL_LIST)) ||
    (inputColumns !== undefined && !isStringArray(inputColumns)) ||
    (outputColumns !== undefined && !isStringArray(outputColumns)) ||
    (preprocessingFunctions !== undefined && !Array.isArray(preprocessingFunctions))
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

  switch (scheme) {
    case 'decentralized': break
    case 'federated': break
    case 'local': break
    default: return false
  }

  const repack = {
    IMAGE_W,
    IMAGE_H,
    LABEL_LIST,
    aggregator,
    batchSize,
    byzantineRobustAggregator,
    clippingRadius,
    dataType,
    decentralizedSecure,
    epochs,
    inputColumns,
    maxShareValue,
    minimumReadyPeers,
    modelID,
    noiseScale,
    outputColumns,
    preprocessingFunctions,
    roundDuration,
    scheme,
    tauPercentile,
    validationSplit,
  }
  const _correct: TrainingInformation = repack
  // const _total: Record<keyof TrainingInformation, unknown> = repack

  return true
}
