import createDebug from "debug";
import * as tf from '@tensorflow/tfjs'

import type { GPTConfig } from './config.js'
import { getModelSizes, DEFAULT_CONFIG } from './config.js'
import { getCustomAdam, clipByGlobalNormObj } from './optimizers.js'
import { GPTArchitecture } from './layers.js'

const debug = createDebug("discojs:models:gpt");

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

  constructor(partialConfig?: GPTConfig, layersModel?: tf.LayersModel) {
    // Fill missing config parameters with default values
    let completeConfig: Required<GPTConfig> = { ...DEFAULT_CONFIG, ...partialConfig }
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

  override async trainOnBatch(x: tf.Tensor, y: tf.Tensor): Promise<number | number[]> {
    let weightUpdateTime = performance.now()

    let preprocessingTime = performance.now()
    await Promise.all([x.data(), y.data()])
    preprocessingTime = performance.now() - preprocessingTime

    let logitsTensor: tf.Tensor<tf.Rank>;
    const lossTensor = tf.tidy(() => {
      const { grads, value: lossTensor } = this.optimizer.computeGradients(() => {
        const logits = this.apply(x)
        if (Array.isArray(logits))
          throw new Error('model outputs too many tensor')
        if (logits instanceof tf.SymbolicTensor)
          throw new Error('model outputs symbolic tensor')
        logitsTensor = tf.keep(logits)
        return tf.losses.softmaxCrossEntropy(y, logits)
      })
      const gradsClipped = clipByGlobalNormObj(grads, 1)
      this.optimizer.applyGradients(gradsClipped)
      return lossTensor
    })

    // @ts-expect-error Variable 'logitsTensor' is used before being assigned
    const accTensor = tf.metrics.categoricalAccuracy(y, logitsTensor)
    const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
    const accSumTensor = accTensor.sum()
    const accSum = await accSumTensor.array()
    if (typeof accSum !== 'number')
      throw new Error('got multiple accuracy sum')
    // @ts-expect-error Variable 'logitsTensor' is used before being assigned
    tf.dispose([accTensor, accSumTensor, logitsTensor])
    
    const loss = await lossTensor.array()
    weightUpdateTime = performance.now() - weightUpdateTime

    tf.dispose([x, y, lossTensor])
    
    const memory = tf.memory().numBytes / 1024 / 1024 / 1024
    debug("training metrics: %O", {
      loss,
      memory,
      allocated: tf.memory().numTensors,
      preprocessingTime,
      weightUpdateTime,
    });
    return [loss, accSum / accSize]
  }
}
