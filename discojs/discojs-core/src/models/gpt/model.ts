import * as tf from '@tensorflow/tfjs'

import type { GPTConfig } from './config.js'
import { getModelSizes, DEFAULT_CONFIG } from './config.js'
import { getCustomAdam, clipByGlobalNormObj } from './optimizers.js'
import evaluate from './evaluate.js'
import type { TrainingCallbacks } from './types.js'
import {Range, LogLayer, TransformerBlock } from './layers.js'


/**
 * The GPTArchitecture specifically defines a GPT forward pass, i.e.,
 * what are the inputs, the successive transformer blocks and the outputs. It is then 
 * used to create a GPTModel
 * 
 * @param conf GPTConfig
 * @returns model, tf.LayersModel, which supports model(inputs), model.predict and model.apply
 */
function GPTArchitecture (config: Required<GPTConfig>): tf.LayersModel {
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
 * GPTModel extends tf.LayersModel and overrides tfjs' default training loop
 * 
 */
class GPTModel extends tf.LayersModel {
  protected readonly config: Required<GPTConfig>

  constructor(partialConfig?: GPTConfig) {
    // Complete missing config parameters with default values
    let completeConfig: Required<GPTConfig> = { ...DEFAULT_CONFIG, ...partialConfig }
    // Add layer sizes depending on which model has been specified
    completeConfig = { ...completeConfig, ...getModelSizes(completeConfig.modelType) }

    // Init the tf.LayersModel and assign it to this
    const gpt = GPTArchitecture(completeConfig)
    const { inputs, outputs, name } = gpt
    super({ inputs, outputs, name })
    this.config = completeConfig
  }

  async fitDataset<T>(dataset: Dataset<T>, trainingArgs: tf.ModelFitDatasetArgs<T>): Promise<tf.History> {
    const callbacks = trainingArgs.callbacks as TrainingCallbacks
    const evalDataset = trainingArgs.validationData as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
    const opt = this.config.weightDecay !== 0
      ? getCustomAdam(this, this.config.lr, this.config.weightDecay)
      : tf.train.adam(this.config.lr)
    
    await callbacks.onTrainBegin?.()
    for (let epoch = 1; epoch <= trainingArgs.epochs; epoch++) {
      let averageLoss = 0
      let iteration = 1
      const iterator = await dataset.iterator()
      let continueTraining = true
      while (continueTraining) {
        let preprocessingTime = performance.now()
        const next = await iterator.next()
        preprocessingTime = performance.now() - preprocessingTime

        let weightUpdateTime = performance.now()
        await callbacks.onEpochBegin?.(epoch)
        const { xs, ys } = next.value as { xs: tf.Tensor2D, ys: tf.Tensor3D }

        const lossFn: () => tf.Scalar = () => {
          const logits = this.apply(xs)
          if (Array.isArray(logits)) {
            throw new Error('model outputs too many tensor')
          }
          if (logits instanceof tf.SymbolicTensor) {
            throw new Error('model outputs symbolic tensor')
          }
          return tf.losses.softmaxCrossEntropy(ys, logits)
        }

        const lossTensor = tf.tidy(() => {
          const { grads, value: lossTensor } = opt.computeGradients(lossFn)
          const gradsClipped = clipByGlobalNormObj(grads, 1)
          opt.applyGradients(gradsClipped)
          return lossTensor
        })
        
        const loss = await lossTensor.array()
        averageLoss += loss
        tf.dispose([xs, ys, lossTensor, next.value])

        weightUpdateTime = performance.now() - weightUpdateTime
        console.log(
          `Epoch: ${epoch}`,
          `\tStep: ${iteration} / ${this.config.maxIter}`,
          `\tLoss: ${loss.toFixed(3)}`,
          `\tMemory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`,
          `\tNumber of tensors allocated: ${tf.memory().numTensors}`,
          `\tPreprocessing time: ${preprocessingTime.toFixed(0)} ms`,
          `\tWeight update time: ${weightUpdateTime.toFixed(0)} ms`
        )

        if (evalDataset !== undefined && this.config.evaluateEvery !== undefined
          && iteration % this.config.evaluateEvery == 0) {
          const logs = await evaluate(this, evalDataset, this.config.maxEvalBatches)
          console.log(logs)
        }
        iteration++
        continueTraining = next.done !== true && iteration <= this.config.maxIter
      }
      let logs: tf.Logs = {
        'training_loss': averageLoss / iteration
      }
      if (evalDataset !== undefined) {
        logs = { ...logs, ...await evaluate(this, evalDataset, this.config.maxEvalBatches) }
        console.log(logs)
      }
      await callbacks.onEpochEnd?.(epoch, logs)
    }

    opt.dispose()
    await callbacks.onTrainEnd?.()
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
