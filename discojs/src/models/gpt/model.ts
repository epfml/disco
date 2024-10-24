import createDebug from "debug";
import * as tf from '@tensorflow/tfjs'

import type { GPTConfig } from './config.js'
import { getModelSizes, DefaultGPTConfig, GenerationConfig } from './config.js'
import { getCustomAdam, clipByGlobalNormObj } from './optimizers.js'
import evaluate from './evaluate.js'
import { GPTArchitecture } from './layers.js'

const debug = createDebug("discojs:models:gpt:model");

/**
 * tfjs does not export LazyIterator and Dataset...
 */
declare abstract class LazyIterator<T> {
  abstract next (): Promise<IteratorResult<T>>
}

export declare abstract class Dataset<T> {
  abstract iterator (): Promise<LazyIterator<T>>
  size: number
}

/**
 * GPTModel extends tf.LayersModel and overrides tfjs' default training loop
 * 
 */
class GPTModel extends tf.LayersModel {
  protected readonly config: Required<GPTConfig>

  constructor(partialConfig?: GPTConfig, layersModel?: tf.LayersModel) {
    // Fill missing config parameters with default values
    let completeConfig: Required<GPTConfig> = { ...DefaultGPTConfig, ...partialConfig }
    // Add layer sizes depending on which model has been specified
    completeConfig = { ...completeConfig, ...getModelSizes(completeConfig.modelType) }

    if (layersModel !== undefined) {
      super({ inputs: layersModel.inputs, outputs: layersModel.outputs,name: layersModel.name })
    } else {
      const gpt = GPTArchitecture(completeConfig)
      const { inputs, outputs, name } = gpt
      super({ inputs, outputs, name })
    }
    this.config = completeConfig
  }

  get getGPTConfig() {
    return this.config
  }

  override compile() {
    if (this.optimizer !== undefined) return
    this.optimizer = this.config.weightDecay !== 0
      ? getCustomAdam(this, this.config.lr, this.config.weightDecay)
      : tf.train.adam(this.config.lr) 
  }

  override async fitDataset<T>(dataset: Dataset<T>, trainingArgs: tf.ModelFitDatasetArgs<T>): Promise<tf.History> {
    const callbacks = trainingArgs.callbacks as tf.CustomCallbackArgs
    const evalDataset = trainingArgs.validationData as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
    await callbacks.onTrainBegin?.()
    for (let epoch = 1; epoch <= trainingArgs.epochs; epoch++) {
      let accuracyFraction: [number, number] = [0, 0];
      let averageLoss = 0
      let iteration = 1
      const iterator = await dataset.iterator()
      let next = await iterator.next()

      while (next.done !== true && iteration <= this.config.maxIter) {
        let weightUpdateTime = performance.now()
        await callbacks.onEpochBegin?.(epoch)
        const { xs, ys } = next.value as { xs: tf.Tensor2D, ys: tf.Tensor3D }

        let preprocessingTime = performance.now()
        await Promise.all([xs.data(), ys.data()])
        preprocessingTime = performance.now() - preprocessingTime
        
        // TODO include as a tensor inside the model
        const accTensor = tf.tidy(() => {
          const logits = this.apply(xs)
          if (Array.isArray(logits))
            throw new Error('model outputs too many tensor')
          if (logits instanceof tf.SymbolicTensor)
            throw new Error('model outputs symbolic tensor')
          return tf.metrics.categoricalAccuracy(ys, logits)
        })
        const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
        const accSumTensor = accTensor.sum()
        const accSum = await accSumTensor.array()
        tf.dispose(accSumTensor)
        if (typeof accSum !== 'number')
          throw new Error('got multiple accuracy sum')
        accuracyFraction = [accuracyFraction[0] + accSum, accuracyFraction[1] + accSize];
        tf.dispose([accTensor])

        const lossTensor = tf.tidy(() => {
          const { grads, value: lossTensor } = this.optimizer.computeGradients(() => {
            const logits = this.apply(xs)
            if (Array.isArray(logits))
              throw new Error('model outputs too many tensor')
            if (logits instanceof tf.SymbolicTensor)
              throw new Error('model outputs symbolic tensor')
            return tf.losses.softmaxCrossEntropy(ys, logits)
          })
          const gradsClipped = clipByGlobalNormObj(grads, 1)
          this.optimizer.applyGradients(gradsClipped)
          return lossTensor
        })
        
        const loss = await lossTensor.array()
        averageLoss += loss
        weightUpdateTime = performance.now() - weightUpdateTime

        tf.dispose([xs, ys, lossTensor])
        
        if (
          evalDataset !== undefined &&
          this.config.evaluateEvery !== undefined &&
          iteration % this.config.evaluateEvery == 0
        ){
          const iterationLogs = await evaluate(this, evalDataset, this.config.maxEvalBatches)
          debug('evaluation metrics: %O', iterationLogs);
        }
        const memory = tf.memory().numBytes / 1024 / 1024 / 1024
        debug("training metrics: %O", {
          epoch,
          iteration,
          loss,
          memory,
          allocated: tf.memory().numTensors,
          preprocessingTime,
          weightUpdateTime,
        });
        iteration++
        next = await iterator.next()
      }
      // Memory leak: If we reached the last iteration rather than the end of the dataset, cleanup the tensors
      if (next.done !== true && iteration > this.config.maxIter) {
        const { xs, ys } = next.value as { xs: tf.Tensor2D, ys: tf.Tensor3D }
        tf.dispose([xs, ys])
      }
      let logs: tf.Logs = {
        'loss': averageLoss / (iteration - 1), // -1 because iteration got incremented at the end of the loop
        'acc': accuracyFraction[0] / accuracyFraction[1],
      }
      if (evalDataset !== undefined) {
        logs = { ...logs, ...await evaluate(this, evalDataset, this.config.maxEvalBatches) }
      }
      await callbacks.onEpochEnd?.(epoch, logs)
    }
    await callbacks.onTrainEnd?.()
    return new tf.History()
  }
}

function prepareIdx (idx: tf.TensorLike): tf.Tensor2D {
  return tf.tidy(() => {
    let ret: tf.Tensor
    if (idx instanceof tf.Tensor) ret = idx.clone()
    else ret = tf.tensor(idx)
    if (ret.dtype !== 'int32') ret = ret.toInt()
    
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

  /**
   * 
   * @param input 
   * @param config 
   * @returns 
   */
  async generate (input: tf.TensorLike, config: GenerationConfig): Promise<number[][]> {
    let sequenceBatch = prepareIdx(input)
    // Auto-regressive generation loop: 
    // generate the next token, concatenate it to the input sequence
    // and feed it again to the model to get the next token
    for (let step = 0; step < config.maxNewTokens; step++) {
      const idxNext = this.generateOneToken(sequenceBatch, config)
      const idxNew = sequenceBatch.concat(idxNext, 1)
      tf.dispose(sequenceBatch)
      sequenceBatch = idxNew
      tf.dispose(idxNext)
    }
    const idxArr = await sequenceBatch.array()
    tf.dispose(sequenceBatch)
    return idxArr
  }

  /**
   * Generate the next token for each input sequence in the batch.
   * In other words, takes an input tensor of shape (batch size B, prompt length T) and returns a tensor of shape (B, T+1)
   * 
   * @param sequenceBatch input token sequenceBatch of shape (B, T). T is truncated to the model's block size
   * @param config generation config: maxNewTokens, temperature, doSample, topk
   * @returns the next token predicted by the model for each input sequence in the batch
   */
  private generateOneToken (sequenceBatch: tf.Tensor2D, config: GenerationConfig): tf.Tensor2D {
    const idxNext = tf.tidy(() => {
      // slice input sequenceBatch if longer than context length
      const blockSize = this.config.blockSize
      // Truncate the prompt lengths to the max context length (batch size B, prompt length <= T)
      sequenceBatch = sequenceBatch.shape[1] <= blockSize ? sequenceBatch : sequenceBatch.slice([0, sequenceBatch.shape[1] - blockSize])
      const output = this.predict(sequenceBatch) // (B, T, vocab_size)
      if (Array.isArray(output)) throw new Error('The model outputs too multiple values')
      if (output.shape.length !== 3) throw new Error('The model outputs wrong shape')
      const logits = output as tf.Tensor3D 
        
      const logitsScaled = logits
        .slice([0, sequenceBatch.shape[1] - 1, 0]) // take the logits at the last position (B, 1, vocab_size)
        .reshape([logits.shape[0], logits.shape[2]]) // (B, vocab_size)
        .div<tf.Tensor2D>(tf.scalar(config.temperature)) // the higher the temperature, the more random the output
      const probs = logitsScaled.softmax(-1) // get the token probabilities (B, vocab_size) 
      if (config.doSample) {
        // returns topk biggest values among the `vocab_size` probabilities and the corresponding tokens indices 
        // both shapes are (B, config.topk)
        const { values: topkProbs, indices: topkTokens } = tf.topk(probs, config.topk);
        // sample an index from the top-k probabilities
        // e.g. [[0.1, 0.4, 0.3], [0.1, 0.2, 0.5]] -> [[1], [2]]
        // note: multinomial does not need the input to sum to 1
        const selectedIndices = tf.multinomial(topkProbs, 1, config.seed, false).squeeze([1]) // (B, )
        // return the corresponding token from the sampled indices (one per sequence in the batch).
        // if for some reason the probabilities are NaN, selectedIndices will be out of bounds
        return topkTokens.gather(selectedIndices, 1) // (B, 1)
      } else {
        // greedy decoding: return the token with the highest probability
        return probs.argMax(-1).expandDims<tf.Tensor2D>(1)
      }
    })
    return idxNext
  }
}