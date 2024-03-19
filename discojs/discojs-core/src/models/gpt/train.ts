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
  console.log('Train before - numTensors: ' + tf.memory().numTensors, `${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`)
  const c = resolveConfig(config)
  const opt = c.weightDecay !== 0 ? getCustomAdam(model, c) : tf.train.adam(c.lr)

  await callbacks.onTrainBegin?.()
  for (let epoch = 1; epoch <= epochs; epoch++) {
    let iteration = 1
    const iterator = await ds.iterator()
    while (true) {
      const next = await iterator.next()
      if (next.done === true) {
        break
      }
      await callbacks.onEpochBegin?.(epoch)
      const { xs, ys } = next.value

      const lossFn: () => tf.Scalar = () => {
        const logits = model.apply(xs)
        if (Array.isArray(logits)) { throw new Error('model outputs too many tensor') }
        if (logits instanceof tf.SymbolicTensor) { throw new Error('model outputs symbolic tensor') }
        return tf.losses.softmaxCrossEntropy(ys, logits)
      }
      const lossTensor = tf.tidy(() => {
        const { grads, value: loss } = opt.computeGradients(lossFn)
        const gradsClipped = clipByGlobalNormObj(grads, 1)
        opt.applyGradients(gradsClipped)
        return loss
      })

      const loss = await lossTensor.array()
      tf.dispose([xs, ys, lossTensor, loss])
      console.log(
        `Epoch: ${epoch}`,
        `\tStep: ${iteration} / ${c.maxIter}`,
        `\tLoss: ${loss.toFixed(3)}`,
        `\tMemory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`
      )
      // Check if we should stop
      iteration++
      if (iteration > c.maxIter) {
        break
      }
      let logs: tf.Logs | undefined
      if (evalDs !== undefined) {
        logs = await evaluate(model, evalDs, c.maxEvalBatches)
      }
      await callbacks.onEpochEnd?.(epoch, logs)
      await new Promise((resolve) => setTimeout(resolve, 1))
    }
  }

  opt.dispose()
  console.log('Train after - numTensors: ' + tf.memory().numTensors, `${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`)
  await callbacks.onTrainEnd?.()
}

// let epoch = 1
// let iteration = 1
// let iterator = await ds.iterator()

// while (true) {
//   let next = await iterator.next()
//   if (next.done === true) {
//     epoch++
//     if (epoch > epochs) {
//       break
//     }
//     iterator = await ds.iterator()
//     next = await iterator.next()
//   }
//   await callbacks.onEpochBegin?.(epoch)
//   const { xs, ys } = next.value

//   // Keep loss for reporting
//   let loss
//   const optFunc: () => tf.Scalar = () => {
//     const logits = model.apply(xs as tf.Tensor2D)
//     loss = tf.keep(tf.losses.softmaxCrossEntropy(ys, logits))
//     return loss as tf.Scalar
//   }
//   tf.tidy(() => {
//     const { value, grads } = opt.computeGradients(optFunc)
//     const gradsClipped = clipByGlobalNormObj(grads, 1)
//     opt.applyGradients(gradsClipped)
//   })
//   if (loss !== undefined) {
//     tf.dispose([(loss as tf.Scalar)])
//   }
//   xs.dispose()
//   ys.dispose()

//   // Check if we should stop
//   iteration++
//   if (iteration > c.maxIter) {
//     break
//   }

// for (let epoch = 1; epoch <= epochs; epoch++) {
//   await callbacks.onEpochBegin?.(epoch)

//   // Zip each batch with the iteration number
//   await tf.data.zip<[number, { xs: tf.Tensor2D, ys: tf.Tensor3D }]>([
//     tf.data.generator(function * () {
//       for (let i = 1; i <= c.maxIter; i++) { yield i }
//     }),
//     ds
//   ]).mapAsync(async ([iteration, { xs, ys }]) => {
//     await callbacks.onBatchBegin?.(iteration)
//     let loss
//     const optFunc: () => tf.Scalar = () => {
//       const logits = model.apply(xs)
//       if (Array.isArray(logits)) { throw new Error('model outputs too many tensor') }
//       if (logits instanceof tf.SymbolicTensor) { throw new Error('model outputs symbolic tensor') }
//       loss = tf.keep(tf.losses.softmaxCrossEntropy(ys, logits))
//       return loss as tf.Scalar
//     }
//     tf.tidy(() => {
//       const { value, grads } = opt.computeGradients(optFunc)
//       const gradsClipped = clipByGlobalNormObj(grads, 1)
//       opt.applyGradients(gradsClipped)
//     })
//     let lossNumber = 0
//     if (loss !== undefined) {
//       lossNumber = await (loss as tf.Scalar).array()
//       tf.dispose([(loss as tf.Scalar)])
//     }
//     xs.dispose()
//     ys.dispose()
//     // const lossFn: () => tf.Scalar = () => {
//     //   const logits = model.apply(xs)
//     //   if (Array.isArray(logits)) { throw new Error('model outputs too many tensor') }
//     //   if (logits instanceof tf.SymbolicTensor) { throw new Error('model outputs symbolic tensor') }
//     //   const loss = tf.losses.softmaxCrossEntropy(ys, logits)
//     //   return loss as tf.Scalar
//     // }
//     // const loss = tf.tidy(() => {
//     //   const { grads, value: loss } = opt.computeGradients(lossFn)
//     //   const gradsClipped = clipByGlobalNormObj(grads, 1)
//     //   opt.applyGradients(gradsClipped)
//     //   return loss
//     // })

//     // const lossNumber = await loss.array()
//     // tf.dispose([xs, ys, loss])
//     await callbacks.onBatchEnd?.(iteration)
//     return [iteration, lossNumber]
//   }).forEachAsync(([iteration, loss]) => {
//     const a = loss
//     // console.log(
//     //   `Epoch: ${epoch}`,
//     //   `\tStep: ${iteration} / ${c.maxIter}`,
//     //   `\tLoss: ${loss.toFixed(3)}`,
//     //   `\tMemory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`
//     // )
//   })

// let logs: tf.Logs | undefined
// if (evalDs !== undefined) {
//   logs = await evaluate(model, evalDs, c.maxEvalBatches)
// }
// await callbacks.onEpochEnd?.(epoch, logs)
// await new Promise((resolve) => setTimeout(resolve, 1))
// }
