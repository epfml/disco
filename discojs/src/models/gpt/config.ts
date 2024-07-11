type GPTModelType =
  | 'gpt2'
  | 'gpt2-medium'
  | 'gpt2-large'
  | 'gpt2-xl'
  | 'gpt-mini'
  | 'gpt-micro'
  | 'gpt-nano'

export interface GPTConfig {
  lr: number
  blockSize: number
  vocabSize: number
  modelType: GPTModelType
  name?: string,
  evaluate?: boolean
  maxEvalBatches?: number
  evaluateEvery?: number
  maxIter?: number
  weightDecay?: number
  verbose?: 0 | 1
  bias?: boolean
  debug?: boolean
  dropout?: number
  residDrop?: number
  embdDrop?: number
  tokEmb?: boolean
  lmHead?: boolean
  nLayer?: number
  nHead?: number
  nEmbd?: number
}
// for a benchmark of performance, see https://github.com/epfml/disco/pull/659
export const DEFAULT_CONFIG: Required<GPTConfig> = {
  name: 'transformer',
  lr: 0.001,
  weightDecay: 0,
  maxIter: 10,
  verbose: 0,
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
  nLayer: 3,
  nHead: 3,
  nEmbd: 48,
}

export type ModelSize = {
  nLayer: number
  nHead: number
  nEmbd: number
}

export function getModelSizes (modelType: GPTModelType): Required<ModelSize> {
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
