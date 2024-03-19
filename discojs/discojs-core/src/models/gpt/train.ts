import tf from '@tensorflow/tfjs'

import { AdamW, clipByGlobalNormObj } from './optimizers'
import type { GPTConfig } from './config'
import { DEFAULT_CONFIG } from './config'
import evaluate from './evaluate'
import type { TrainingCallbacks } from './types'

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
  const namedWeights = (model as unknown as any).getNamedWeights() as Array<{ name: string, tensor: tf.Tensor }>

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

  console.warn('=== Starting training ===')

  for (let epoch = 1; epoch <= epochs; epoch++) {
    await callbacks.onEpochBegin?.(epoch)

    await tf.data.zip<[number, { xs: tf.Tensor2D, ys: tf.Tensor3D }]>([
      tf.data.generator(function * () {
        for (let i = 1; i <= c.maxIter; i++) { yield i }
      }),
      ds
    ]).mapAsync(async ([iteration, { xs, ys }]) => {
      await callbacks.onBatchBegin?.(iteration)
      return { iteration, xs, ys }
    }).map(({ iteration, xs, ys }) => tf.tidy(() => {
      const { grads, value: loss } = opt.computeGradients(() => {
        const logits = model.apply(xs)
        if (Array.isArray(logits)) {
          throw new Error('model outputed many tensor')
        }
        if (logits instanceof tf.SymbolicTensor) {
          throw new Error('model outputed symbolic tensor')
        }

        const loss = tf.losses.softmaxCrossEntropy(ys, logits)
        return loss as tf.Scalar
      })

      tf.dispose([xs, ys])

      const gradsClipped = clipByGlobalNormObj(grads, 1)
      opt.applyGradients(gradsClipped)

      return { iteration, loss }
    })).mapAsync(async ({ iteration, loss }) => {
      const raw = await loss.array()
      tf.dispose(loss)
      return [iteration, raw]
    }).mapAsync(async ([iteration, loss]) => {
      await callbacks.onBatchEnd?.(iteration)
      return [iteration, loss]
    }).forEachAsync(([iteration, loss]) => {
      console.log(
        `Epoch: ${epoch}`,
        `\tStep: ${iteration} / ${c.maxIter}`,
        `\tLoss: ${loss.toFixed(3)}`,
        `\tMemory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`
      )
    })

    let logs: tf.Logs | undefined
    if (evalDs !== undefined) {
      logs = await evaluate(model, evalDs, c.maxEvalBatches)
    }
    console.log(epoch)
    await callbacks.onEpochEnd?.(epoch, logs)
    await new Promise((resolve) => setTimeout(resolve, 1))
  }

  await callbacks.onTrainEnd?.()
}
