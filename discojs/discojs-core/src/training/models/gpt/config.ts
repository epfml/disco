type ModelType =
    | 'gpt2'
    | 'gpt2-medium'
    | 'gpt2-large'
    | 'gpt2-xl'
    | 'gpt-mini'
    | 'gpt-micro'
    | 'gpt-nano'

type ModelSize = {
    nLayer?: number
    nHead?: number
    nEmbd?: number
}

export type GPTConfig = {
    lr: number
    batchSize: number
    blockSize: number
    vocabSize: number
    evaluate?: boolean
    maxEvalBatches?: number
    evaluateEvery?: number
    epochs?: number
    maxIter?: number
    weightDecay?: number
    verbose?: boolean
    bias?: boolean
    debug?: boolean
    dropout?: number
    residDrop?: number
    embdDrop?: number
    tokEmb?: boolean
    lmHead?: boolean
    modelType: ModelType
}

export const DEFAULT_CONFIG: Required<GPTConfig> = {
    lr: 0.001,
    weightDecay: 0,
    batchSize: 2,
    epochs: 9999,
    maxIter: 10_000,
    verbose: false,
    modelType: 'gpt-nano',
    evaluate: true,
    maxEvalBatches: 12,
    evaluateEvery: 100,
    blockSize: 128,
    vocabSize: 50258,
    bias: true,
    debug: false,
    dropout: 0.2,
    residDrop: 0.2,
    embdDrop: 0.2,
    tokEmb: true,
    lmHead: true,
}

export const getModelSizes = (modelType: ModelType): Required<ModelSize> => {
    switch (modelType) {
        case 'gpt2':
            return { nLayer: 12, nHead: 12, nEmbd: 768 }
        case 'gpt2-medium':
            return { nLayer: 24, nHead: 16, nEmbd: 1024 }
        case 'gpt2-large':
            return { nLayer: 36, nHead: 20, nEmbd: 1280 }
        case 'gpt2-xl':
            return { nLayer: 48, nHead: 25, nEmbd: 1600 }
        case 'gpt-mini':
            return { nLayer: 6, nHead: 6, nEmbd: 192 }
        case 'gpt-micro':
            return { nLayer: 4, nHead: 4, nEmbd: 128 }
        case 'gpt-nano':
            return { nLayer: 3, nHead: 3, nEmbd: 48 }
    }
}
