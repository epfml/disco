import { assert } from 'chai'
import tf from '@tensorflow/tfjs'

import type { Model } from '..'
import { serialization, models } from '..'

async function getRawWeights (model: Model): Promise<Array<[number, Float32Array]>> {
  return Array.from(
    (await Promise.all(
      model.weights.weights.map(async (w) => await w.data<'float32'>()))
    ).entries()
  )
}

describe('model', () => {
  it('can encode what it decodes', async () => {
    const rawModel = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [32, 32, 3],
          kernelSize: 3,
          filters: 16,
          activation: 'relu'
        })
      ]
    })
    rawModel.compile({ optimizer: 'sgd', loss: 'hinge' })
    const model = new models.TFJS(rawModel)

    const encoded = await serialization.model.encode(model)
    assert.isTrue(serialization.model.isEncoded(encoded))
    const decoded = await serialization.model.decode(encoded)

    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded)
    )
  })
})
