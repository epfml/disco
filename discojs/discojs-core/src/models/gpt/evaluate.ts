import * as tf from '@tensorflow/tfjs'

export default async function evaluate (
  model: tf.LayersModel,
  dataset: tf.data.Dataset<{ xs: tf.Tensor, ys: tf.Tensor }>
): Promise<Record<'acc' | 'val_acc' | 'val_loss' | 'val_perplexity', number>> {
  let datasetSize = 0
  let totalLoss = 0
  const acc: [number, number] = [0, 0]

  await dataset.map(({ xs, ys }) => {
    const logits = model.apply(xs)
    if (Array.isArray(logits)) {
      throw new Error('model outputed many tensor')
    }
    if (logits instanceof tf.SymbolicTensor) {
      throw new Error('model outputed symbolic tensor')
    }
    xs.dispose()

    return { logits, ys }
  }).mapAsync(async ({ logits, ys }) => {
    const loss = (await tf.losses.softmaxCrossEntropy(ys, logits).array())
    if (typeof loss !== 'number') {
      throw new Error('got multiple loss')
    }

    const accTensor = tf.metrics.categoricalAccuracy(ys, logits)
    const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
    const accSum = accTensor.sum()
    const accSummed = await accSum.array()
    if (typeof accSummed !== 'number') {
      throw new Error('got multiple accuracy sum')
    }

    tf.dispose([ys, logits, accTensor, accSum])

    return { loss, accSummed, accSize }
  }).forEachAsync(({ loss, accSummed, accSize }) => {
    datasetSize += 1
    totalLoss += loss
    acc[0] += accSummed
    acc[1] += accSize
  })

  const loss = totalLoss / datasetSize

  return {
    val_loss: loss,
    val_perplexity: Math.exp(loss),
    acc: acc[0] / acc[1],
    val_acc: acc[0] / acc[1]
  }
}
