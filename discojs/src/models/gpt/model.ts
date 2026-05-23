import createDebug from "debug";
import * as tf from '@tensorflow/tfjs'

import type { GPTConfig } from './config.js'
import { getModelSizes, DefaultGPTConfig } from './config.js'
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
export class GPTModel extends tf.LayersModel {
  protected readonly config: Required<GPTConfig>
  #debugLabel?: string

  constructor(partialConfig?: Partial<GPTConfig>, layersModel?: tf.LayersModel) {
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

  setDebugLabel(label: string): void {
    this.#debugLabel = label
  }

  #debugMessage(message: string): string {
    return this.#debugLabel === undefined ? message : `[${this.#debugLabel}] ${message}`
  }

  override compile() {
    if (this.optimizer !== undefined) return
    this.optimizer = this.config.weightDecay !== 0
      ? getCustomAdam(this, this.config.lr, this.config.weightDecay)
      : tf.train.adam(this.config.lr) 
  }

  override async fitDataset<T>(dataset: Dataset<T>, trainingArgs: tf.ModelFitDatasetArgs<T> & { iterationOffset?: number }): Promise<tf.History> {
    const callbacks = trainingArgs.callbacks as tf.CustomCallbackArgs
    const evalDataset = trainingArgs.validationData as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
    const iterationOffset = trainingArgs.iterationOffset ?? 0
    await callbacks.onTrainBegin?.()

    for (let epoch = 1; epoch <= trainingArgs.epochs; epoch++) {
      let accuracyFraction: [number, number] = [0, 0];
      let averageLoss = 0
      let iteration = 1

      debug(this.#debugMessage("before iterator init"))
      const iterator = await dataset.iterator()
      debug(this.#debugMessage("after getting iterator, before next"))
      let next = await iterator.next()
      debug(this.#debugMessage("after next of iterator"))

      while (next.done !== true && iteration <= this.config.maxIter) {
        const reportedIteration = iterationOffset + iteration
        let weightUpdateTime = performance.now()
        await callbacks.onEpochBegin?.(epoch)
        const { xs, ys } = next.value as { xs: tf.Tensor2D, ys: tf.Tensor3D }

        let preprocessingTime = performance.now()
        await Promise.all([xs.data(), ys.data()])
        // await Promise.resolve()
        preprocessingTime = performance.now() - preprocessingTime
        
        // TODO include as a tensor inside the model
        // const accTensor = tf.tidy(() => {
        //   const logits = this.apply(xs)
        //   if (Array.isArray(logits))
        //     throw new Error('model outputs too many tensor')
        //   if (logits instanceof tf.SymbolicTensor)
        //     throw new Error('model outputs symbolic tensor')
        //   return tf.metrics.categoricalAccuracy(ys, logits)
        // })
        // const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
        // const accSumTensor = accTensor.sum()
        // const accSum = await accSumTensor.array()
        // tf.dispose(accSumTensor)
        // if (typeof accSum !== 'number')
        //   throw new Error('got multiple accuracy sum')
        // accuracyFraction = [accuracyFraction[0] + accSum, accuracyFraction[1] + accSize];
        // tf.dispose([accTensor])
        accuracyFraction = [Number.NaN, Number.NaN];

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
          tf.dispose(Object.values(gradsClipped))
          return lossTensor
        })
        
        const loss = await lossTensor.array()
        averageLoss += loss
        weightUpdateTime = performance.now() - weightUpdateTime

        tf.dispose([xs, ys, lossTensor])
        
        if (
          evalDataset !== undefined &&
          this.config.evaluateEvery !== undefined &&
          // iteration % this.config.evaluateEvery == 0
          reportedIteration % this.config.evaluateEvery == 0
        ){
          const iterationLogs = await evaluate(this, evalDataset, this.config.maxEvalBatches)
          debug(this.#debugMessage('evaluation metrics: %O'), iterationLogs);
        }
        const memory = tf.memory().numBytes / 1024 / 1024 / 1024
        debug(this.#debugMessage("training metrics: %O"), {
          epoch,
          // iteration,
          iteration: reportedIteration,
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
