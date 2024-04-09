import * as tf from '@tensorflow/tfjs'

import type { GPTConfig } from './config.js'
import { getModelSizes, DEFAULT_CONFIG } from './config.js'
import { train } from './train.js'
import type { TrainingCallbacks } from './types.js'
import {Range, LogLayer, TransformerBlock } from './layers.js'


/**
 * The GPTArchitecture specifically defines a GPT forward pass, i.e.,
 * what are the inputs, the successive transformer blocks and the outputs
 * 
 * @param conf GPTConfig
 * @returns model, tf.LayersModel, which supports model(inputs), model.predict and model.apply
 */
function GPTArchitecture (conf: GPTConfig): tf.LayersModel {
  const configDefaults = {
    name: 'transformer',
    ...DEFAULT_CONFIG
  }

  const modelSizes = getModelSizes(conf.modelType)
  const config = Object.assign({}, configDefaults, conf, modelSizes)

  const inputs = tf.input({ shape: [null] })

  //Token embedding
  const tokEmb = config.tokEmb
    ? tf.layers.embedding({
      name: config.name + '/wte',
      inputDim: config.vocabSize,
      outputDim: config.nEmbd,
      embeddingsInitializer: 'zeros',
      embeddingsRegularizer: undefined,
      activityRegularizer: undefined
    }).apply(inputs) as tf.SymbolicTensor
    : inputs

  // Positional embedding
  const range = new Range({}).apply(inputs)
  let posEmb = tf.layers.embedding({
    name: config.name + '/wpe',
    inputDim: config.blockSize,
    outputDim: config.nEmbd,
    embeddingsInitializer: 'zeros'
  }).apply(range) as tf.SymbolicTensor
  
  if (config.debug) {
    posEmb = new LogLayer({ name: 'posEmb' }).apply(posEmb) as tf.SymbolicTensor
  }

  // token and positional embeddings are added together
  let x = tf.layers.add().apply([tokEmb, posEmb])
  //dropout
  x = tf.layers.dropout({name: 'drop', rate: config.embdDrop}).apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'dropadd' }).apply(x)
  }

  //Apply successively transformer blocks, attention and dense layers
  for (let i = 0; i < config.nLayer; i++) {
    x = TransformerBlock(
      Object.assign({}, config, { name: config.name + '/h/' + i })
    ).apply(x)
  }
  // Normalization
  x = tf.layers.layerNormalization({ name: config.name + '/ln_f', epsilon: 1e-5 })
    .apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'fin/ln' }).apply(x)
  }

  // Append a language modeling head if specified
  if (config.lmHead) {
    x = tf.layers.dense({
      name: 'lm_head',
      units: config.vocabSize,
      inputDim: config.nEmbd,
      inputShape: [config.blockSize, config.nEmbd],
      useBias: false
    }).apply(x)
  }

  return tf.model({ inputs, outputs: x as tf.SymbolicTensor })
}

/**
 * tfjs does not export LazyIterator and Dataset...
 */
declare abstract class LazyIterator<T> {
  abstract next (): Promise<IteratorResult<T>>
}

declare abstract class Dataset<T> {
  abstract iterator (): Promise<LazyIterator<T>>
  size: number
}

/**
 * GPTModel is a wrapper around GPTArchitecture that overrides tfjs' default training loop
 */
class GPTModel extends tf.LayersModel {
  constructor (protected readonly config: GPTConfig) {
    const gpt = GPTArchitecture(config)
    const { inputs, outputs, name } = gpt
    super({ inputs, outputs, name })
    Object.assign(this, gpt)
  }

  async fitDataset<T> (
    dataset: Dataset<T>,
    args: tf.ModelFitDatasetArgs<T>
  ): Promise<tf.History> {
    const config = { ...this.config, ...args }

    await train(
      this,
      dataset as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>,
      config,
      args.epochs,
      args.callbacks as TrainingCallbacks,
      args.validationData as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
    )

    return new tf.History()
  }
}


interface GenerateConfig {
  maxNewTokens: number
  temperature: number
  doSample: boolean
}

const defaultGenerateConfig: GenerateConfig = {
  maxNewTokens: 20,
  temperature: 1.0,
  doSample: false
}

function prepareIdx (idx: tf.TensorLike): tf.Tensor2D {
  return tf.tidy(() => {
    let ret: tf.Tensor
    if (idx instanceof tf.Tensor) {
      ret = idx.clone()
    } else {
      ret = tf.tensor(idx)
    }
    if (ret.dtype !== 'int32') {
      ret = ret.toInt()
    }
    switch (ret.shape.length) {
      case 1:
        return ret.expandDims(0)
      case 2:
        return ret as tf.Tensor2D
      default:
        throw new Error('unexpected shape')
    }
  })
}

/**
 * GPTForCausalLM stands for GPT model for Causal Language Modeling. Causal because it only looks at past tokens and not future ones
 * This class extends GPTModel and adds supports for text generation
 * 
 */
export class GPTForCausalLM extends GPTModel {
  async generate (idxRaw: tf.TensorLike, conf: GenerateConfig, act?: (_: { idxNext: number[][], timePerToken: number }) => Promise<void>): Promise<number[][]> {
    const config = Object.assign({}, defaultGenerateConfig, conf)
    let idx = prepareIdx(idxRaw)
    for (let step = 0; step < config.maxNewTokens; step++) {
      const { idxNext, timePerToken } = this.generateOnce(this, idx, config)
      const idxNew = idx.concat(idxNext, 1)
      tf.dispose(idx)
      idx = idxNew
      const idxNextArr = await idxNext.array()
      tf.dispose(idxNext)
      if (act !== undefined) {
        await act({ idxNext: idxNextArr, timePerToken })
      }
    }
    const idxArr = await idx.array()
    tf.dispose(idx)
    return idxArr
  }

  private generateOnce (model: tf.LayersModel, idx: tf.Tensor2D, config: GenerateConfig): { idxNext: tf.Tensor2D, timePerToken: number } {
    let timePerToken = performance.now()

    const idxNext = tf.tidy(() => {
      const blockSize = this.config.blockSize
      const idxCond = idx.shape[1] <= blockSize
        ? idx : idx.slice([0, -blockSize], [-1, -1])
      
      const output = model.predict(idxCond)
      if (Array.isArray(output)) throw new Error('The model outputs too multiple values')
      if (output.shape.length !== 3) throw new Error('The model outputs wrong shape')
      const logits = output as tf.Tensor3D

      timePerToken = performance.now() - timePerToken
      const logitsScaled = logits
        .slice([0, idx.shape[1] - 1, 0])
        .reshape([logits.shape[0], logits.shape[2]])
        .div<tf.Tensor2D>(tf.scalar(config.temperature))
      const probs = logitsScaled.softmax(-1)
      if (config.doSample) {
        return tf.multinomial(probs, 1) as tf.Tensor2D
      } else {
        return probs.argMax(-1).expandDims<tf.Tensor2D>(1)
      }
    })

    return {
      idxNext,
      timePerToken
    }
  }
}
