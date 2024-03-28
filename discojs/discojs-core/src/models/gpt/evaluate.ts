import * as tf from '@tensorflow/tfjs'

interface DataPoint extends tf.TensorContainerObject {
  xs: tf.Tensor2D,
  ys: tf.Tensor3D,
}

export default async function evaluate (
  model: tf.LayersModel,
  dataset: tf.data.Dataset<DataPoint>,
  maxEvalBatches: number
): Promise<Record<'acc' | 'val_acc' | 'val_loss' | 'val_perplexity', number>> {
  let datasetSize = 0
  let totalLoss = 0
  const acc: [number, number] = [0, 0]

  await dataset.take(maxEvalBatches).map(({ xs, ys }) => {
    const logits = model.apply(xs)
    if (Array.isArray(logits)) {
      throw new Error('model output too many tensor')
    }
    if (logits instanceof tf.SymbolicTensor) {
      throw new Error('model output symbolic tensor')
    }
    xs.dispose()

    return { logits, ys }
  }).mapAsync(async ({ logits, ys }) => {
    const lossTensor = tf.losses.softmaxCrossEntropy(ys, logits)
    const loss = await lossTensor.array()
    if (typeof loss !== 'number') {
      throw new Error('got multiple loss')
    }

    const accTensor = tf.metrics.categoricalAccuracy(ys, logits)
    const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
    const accSum = accTensor.sum()
    const accSummed = accSum.arraySync()
    if (typeof accSummed !== 'number') {
      throw new Error('got multiple accuracy sum')
    }

    tf.dispose([ys, logits, accTensor, accSum, lossTensor])
    return { loss, accSummed, accSize }
  }).forEachAsync(({ loss, accSummed, accSize }) => {
    datasetSize += 1
    totalLoss += loss
    acc[0] += accSummed
    acc[1] += accSize
  })


  // let iteration = 1
  // const iterator = await dataset.iterator()
  // let continueIterating = true
  // while (continueIterating) {
  //   const next = await iterator.next()

  //   const { xs, ys } = next.value as DataPoint
  //   const logits = model.apply(xs)
  //   if (Array.isArray(logits)) {
  //     throw new Error('model output too many tensor')
  //   }
  //   if (logits instanceof tf.SymbolicTensor) {
  //     throw new Error('model output symbolic tensor')
  //   }
  //   const lossTensor = tf.losses.softmaxCrossEntropy(ys, logits)
  //   const lossValue = await lossTensor.array()
  //   if (typeof lossValue !== 'number') {
  //     throw new Error('got multiple loss')
  //   }

  //   const accTensor = tf.metrics.categoricalAccuracy(ys, logits)
  //   const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
  //   const accSum = accTensor.sum()
  //   const accSummed = await accSum.array()
  //   if (typeof accSummed !== 'number') {
  //     throw new Error('got multiple accuracy sum')
  //   }

  //   datasetSize += 1
  //   totalLoss += lossValue
  //   acc[0] += accSummed
  //   acc[1] += accSize

  //   tf.dispose([xs, ys, logits, accTensor, accSum, lossTensor, next.value])
  //   iteration++
  //   continueIterating = next.done !== true && iteration <= maxEvalBatches
  // }

  const loss = totalLoss / datasetSize
  return {
    val_loss: loss,
    val_perplexity: Math.exp(loss),
    acc: acc[0] / acc[1],
    val_acc: acc[0] / acc[1]
  }
}
