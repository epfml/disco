import * as tf from '@tensorflow/tfjs'

import { AdamW, clipByGlobalNormObj } from './optimizers.js'
import type { GPTConfig } from './config.js'
import { DEFAULT_CONFIG } from './config.js'
import evaluate from './evaluate.js'
import type { TrainingCallbacks } from './types.js'

function resolveConfig (config: GPTConfig): Required<GPTConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...config
  }
}

function getCustomAdam (model: tf.LayersModel, c: Required<GPTConfig>): tf.Optimizer {
  const includeInWeightDecay: string[] = []
  const excludeFromWeightDecay: string[] = []

  // TODO unsafe cast
  const namedWeights = (model as unknown as Record<'getNamedWeights', () => Array<{ name: string, tensor: tf.Tensor }>>).getNamedWeights()

  namedWeights.forEach((v) => {
    if (
      v.name.includes('bias') ||
            v.name.includes('normalization') ||
            v.name.includes('emb')
    ) {
      excludeFromWeightDecay.push(v.name)
    } else {
      includeInWeightDecay.push(v.name)
    }
  })

  return new AdamW({
    learningRate: c.lr,
    weightDecayRate: c.weightDecay,
    includeInWeightDecay,
    excludeFromWeightDecay
  })
}

export async function train (
  model: tf.LayersModel,
  ds: tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>,
  config: GPTConfig,
  epochs: number,
  callbacks: TrainingCallbacks,
  evalDs?: tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
): Promise<void> {
  const c = resolveConfig(config)
  const opt = c.weightDecay !== 0 ? getCustomAdam(model, c) : tf.train.adam(c.lr)

  await callbacks.onTrainBegin?.()
  for (let epoch = 1; epoch <= epochs; epoch++) {
    let iteration = 1
    const iterator = await ds.iterator()
    while (true) {
      const next = await iterator.next()
      if (next.done === true || iteration > c.maxIter) {
        tf.dispose([next.value])
        break
      }
      await callbacks.onEpochBegin?.(epoch)
      const { xs, ys } = next.value

      const lossFn: () => tf.Scalar = () => {
        const logits = model.apply(xs)
        if (Array.isArray(logits)) {
          throw new Error('model outputs too many tensor')
        }
        if (logits instanceof tf.SymbolicTensor) {
          throw new Error('model outputs symbolic tensor')
        }
        return tf.losses.softmaxCrossEntropy(ys, logits)
      }
      const lossTensor = tf.tidy(() => {
        const { grads, value: loss } = opt.computeGradients(lossFn)
        const gradsClipped = clipByGlobalNormObj(grads, 1)
        opt.applyGradients(gradsClipped)
        return loss
      })

      const loss = await lossTensor.array()
      tf.dispose([xs, ys, lossTensor])
      console.log(
        `Epoch: ${epoch}`,
        `\tStep: ${iteration} / ${c.maxIter}`,
        `\tLoss: ${loss.toFixed(3)}`,
        `\tMemory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`
      )
      let logs: tf.Logs | undefined
      if (evalDs !== undefined) {
        logs = await evaluate(model, evalDs, c.maxEvalBatches)
      }
      await callbacks.onEpochEnd?.(epoch, logs)
      await new Promise((resolve) => setTimeout(resolve, 1))
      iteration++
    }
  }

  opt.dispose()
  await callbacks.onTrainEnd?.()
}
