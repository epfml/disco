import { Config, Models as Model } from './tfjs-types'

export const configModels = {
    gpt2: {
        nLayer: 12,
        nHead: 12,
        nEmbd: 768,
        vocabSize: 50257,
        blockSize: 1024,
    },
    'gpt2-medium': {
        nLayer: 24,
        nHead: 16,
        nEmbd: 1024,
        vocabSize: 50257,
        blockSize: 1024,
    },
    'gpt2-large': {
        nLayer: 36,
        nHead: 20,
        nEmbd: 1280,
        vocabSize: 50257,
        blockSize: 1024,
    },
    'gpt2-xl': {
        nLayer: 48,
        nHead: 25,
        nEmbd: 1600,
        vocabSize: 50257,
        blockSize: 1024,
    },
    'gpt-mini': { nLayer: 6, nHead: 6, nEmbd: 192 },
    'gpt-micro': { nLayer: 4, nHead: 4, nEmbd: 128 },
    'gpt-nano': { nLayer: 3, nHead: 3, nEmbd: 48 },
} as const

const modelType: Model = 'gpt-nano'
const model = configModels[modelType]
const dataset = 'wikitext-103'
const batchSize = 8
const blockSize = 128 // = sequence length
const lr = 0.001
const maxIter = 10

const baseConfig = {
    debug: false,
    verbose: false,

    modelType,
    ...model,

    dataset,
    batchSize,
    blockSize,
    lr,
    maxIter,
    shuffle: NaN,
    weightDecay: false, // If set, wasm backend won't work because of the custom AdamW optimizer
    optimizer: 'adamw',
    gradClip: 1,
    scheduler: null,
    embdDrop: 0.2,
    bias: true,
    numWorkers: 0,
    vocabSize: 50257,

    wandbProject: 'disco-gpt-benchmark',

    evalFreq: 25,
    evalSeqPrefix: 'none',
    maxEvalBatches: 24,
} as const

const config: Config = {
    ...baseConfig,
    residDrop: baseConfig.embdDrop,
    wandbName: `${modelType}_${dataset}_bs=${batchSize}_seq=${blockSize}_lr=${lr}_iter=${maxIter}`,
} as const

export default config
