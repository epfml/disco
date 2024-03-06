import { Set } from 'immutable'

import type { AggregatorChoice } from '../aggregator/get.js'
import { PreTrainedTokenizer } from '@xenova/transformers';
import { ImagePreprocessing, TabularPreprocessing,TextPreprocessing } from '../dataset/data/preprocessing/index.js'

export interface ImageConfig {
  type: 'image'

  // validationSplit: fraction of data to keep for validation, note this only works for image data
  validationSplit: number // TODO should be general for loaders
  // IMAGE_H height of image (or RESIZED_IMAGE_H if ImagePreprocessing.Resize in preprocessingFunctions)
  IMAGE_H: number // TODO rename
  // IMAGE_W width of image (or RESIZED_IMAGE_W if ImagePreprocessing.Resize in preprocessingFunctions)
  IMAGE_W: number // TODO rename
  // LABEL_LIST of classes, e.g. if two class of images, one with dogs and one with cats, then we would
  // define ['dogs', 'cats'].
  LABEL_LIST: string[] // TODO rename

  preprocessing: ImagePreprocessing[]
}
export interface TabularConfig {
  type: 'tabular'

  // inputColumns: for tabular data, the columns to be chosen as input data for the model
  inputColumns: string[]
  // outputColumns: for tabular data, the columns to be predicted by the model
  outputColumns: string[]

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
export interface GPTModelConfig {
  type: 'gpt'
}
export type ModelConfigType = TFJSModelConfig | GPTModelConfig

interface BaseNetworkConfig {
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
  // tokenizer (string | PreTrainedTokenizer). This field should be initialized with the name of a Transformers.js pre-trained tokenizer, e.g., 'Xenova/gpt2'. 
  // When the tokenizer is first called, the actual object will be initialized and loaded into this field for the subsequent tokenizations.
  tokenizer?: string | PreTrainedTokenizer
  // maxSequenceLength: the maximum length of a input string used as input to a GPT model. It is used during preprocessing to
  // truncate strings to a maximum length. The default value is tokenizer.model_max_length
  maxSequenceLength?: number
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
export type NetworkConfigType = FederatedNetworkConfig | DecentralizedNetworkConfig

// TODO rename to TrainingConfig?
// TODO remove implicit?
export interface TrainingInformation<
  D extends DatasetConfigType = DatasetConfigType,
  M extends ModelConfigType = ModelConfigType,
  N extends NetworkConfigType = NetworkConfigType,
> {
  // unique ID for the model
  modelID: string // TODO rm

  // number of epochs to run training for
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

function isStringArray(raw: unknown): raw is string[] {
  if (!Array.isArray(raw)) {
    return false
  }
  const arr: unknown[] = raw // isArray is unsafely guarding with any[]

  return arr.every((e) => typeof e === 'string')
}

function isArrayOf<T>(raw: unknown, valid: Set<T>): raw is T[] {
  if (!Array.isArray(raw)) {
    return false
  }
  const arr: unknown[] = raw // isArray is unsafely guarding with any[]

  return arr.every((e) => valid.contains(e as T))
}

function isImageConfig (raw: unknown): raw is ImageConfig {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const {
    type: typeRaw,
    IMAGE_H,
    IMAGE_W,
    LABEL_LIST,
    validationSplit,
    preprocessing,
  }: Partial<Record<keyof ImageConfig, unknown>> = raw

  if (
    typeRaw !== 'image' ||
    typeof validationSplit !== 'number' ||
    typeof IMAGE_H !== 'number' ||
    typeof IMAGE_W !== 'number' ||
    !isStringArray(LABEL_LIST) ||
    !isArrayOf(preprocessing, Set.of(
      ImagePreprocessing.Resize,
      ImagePreprocessing.Normalize,
    ))
  ) {
    return false
  }
  const type: 'image' = typeRaw

  const repack = {
    type,
    IMAGE_W,
    IMAGE_H,
    LABEL_LIST,
    validationSplit,
    preprocessing,
  }
  const _correct: ImageConfig = repack
  const _total: Record<keyof ImageConfig, unknown> = repack

  return true
}

function isTabularConfig (raw: unknown): raw is TabularConfig {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const {
    type: typeRaw,
    inputColumns,
    outputColumns,
    preprocessing,
  }: Partial<Record<keyof TabularConfig, unknown>> = raw

  if (
    typeRaw !== 'tabular' ||
    !isStringArray(inputColumns) ||
    !isStringArray(outputColumns) ||
    !isArrayOf(preprocessing, Set.of(
      TabularPreprocessing.Normalize,
      TabularPreprocessing.Sanitize,
    ))
  ) {
    return false
  }
  const type: 'tabular' = typeRaw

  const repack = {
    type,
    inputColumns,
    outputColumns,
    preprocessing,
  }
  const _correct: TabularConfig = repack
  const _total: Record<keyof TabularConfig, unknown> = repack

  return true
}

function isTextConfig (raw: unknown): raw is TextConfig {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const {
    type: typeRaw,
    preprocessing,
  }: Partial<Record<keyof TextConfig, unknown>> = raw

  if (
    typeRaw !== 'text' ||
    !isArrayOf(preprocessing, Set.of(
      TextPreprocessing.LeftPadding,
      TextPreprocessing.Tokenize,
    ))
  ) {
    return false
  }
  const type: 'text' = typeRaw

  const repack = {
    type,
    preprocessing,
  }
  const _correct: TextConfig = repack
  const _total: Record<keyof TextConfig, unknown> = repack

  return true
}

function isDatasetConfig (raw: unknown): raw is DatasetConfigType {
  return isImageConfig(raw) || isTabularConfig(raw) || isTextConfig(raw)
}

export function isTrainingInformation (raw: unknown): raw is TrainingInformation {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const {
    data,
    aggregator,
    batchSize,
    clippingRadius,
    dataType,
    decentralizedSecure,
    epochs,
    maxShareValue,
    minimumReadyPeers,
    modelID,
    noiseScale,
    roundDuration,
    scheme,
    validationSplit,
    tokenizer,
    maxSequenceLength,
  }: Partial<Record<keyof TrainingInformation, unknown>> = raw

  if (
    typeof dataType !== 'string' ||
    typeof modelID !== 'string' ||
    typeof epochs !== 'number' ||
    typeof batchSize !== 'number' ||
    typeof roundDuration !== 'number' ||
    typeof validationSplit !== 'number' ||
    (tokenizer !== undefined && typeof tokenizer !== 'string' && !(tokenizer instanceof PreTrainedTokenizer)) ||
    (maxSequenceLength !== undefined && typeof maxSequenceLength !== 'number') ||
    !isDatasetConfig(data) ||
    (aggregator !== undefined && typeof aggregator !== 'number') ||
    (clippingRadius !== undefined && typeof clippingRadius !== 'number') ||
    (decentralizedSecure !== undefined && typeof decentralizedSecure !== 'boolean') ||
    (maxShareValue !== undefined && typeof maxShareValue !== 'number') ||
    (minimumReadyPeers !== undefined && typeof minimumReadyPeers !== 'number') ||
    (noiseScale !== undefined && typeof noiseScale !== 'number')
  ) {
    return false
  }

  const repack = {
    data,
    aggregator,
    batchSize,
    clippingRadius,
    dataType,
    decentralizedSecure,
    epochs,
    maxShareValue,
    minimumReadyPeers,
    modelID,
    noiseScale,
    roundDuration,
    scheme,
    validationSplit,
    tokenizer,
    maxSequenceLength
  }
  const _correct: TrainingInformation = repack
  const _total: Record<keyof TrainingInformation, unknown> = repack

  return true
}
