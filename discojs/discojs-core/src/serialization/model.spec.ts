import { assert } from 'chai'

import { tf, serialization } from '..'

async function getRawWeights (model: tf.LayersModel): Promise<Array<[number, Float32Array]>> {
  return Array.from(
    (await Promise.all(
      model.getWeights().map(async (w) => await w.data<'float32'>()))
    ).entries()
  )
}

describe('model', () => {
  it('can encode what it decodes', async () => {
    const model = tf.sequential()

    model.add(
      tf.layers.conv2d({
        inputShape: [32, 32, 3],
        kernelSize: 3,
        filters: 16,
        activation: 'relu'
      })
    )

    const encoded = await serialization.model.encode(model)
    assert.isTrue(serialization.model.isEncoded(encoded))
    const decoded = await serialization.model.decode(encoded)

    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded)
    )
  })
})
