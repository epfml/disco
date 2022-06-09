import { assert } from 'chai'
import * as tf from '@tensorflow/tfjs'

import { encode, decode, isEncoded, Encoded } from './model'
import * as tasks from '../tasks'

async function getRawWeights (model: tf.LayersModel): Promise<Array<[number, Float32Array]>> {
  return Array.from(
    (await Promise.all(
      model.getWeights().map(async (w) => await w.data<'float32'>()))
    ).entries()
  )
}

describe('model', () => {
  it('can encode what it decodes', async () => {
    const model = tasks.mnist.model()

    const encoded: Encoded = await encode(model)
    assert.isTrue(isEncoded(encoded))
    const decoded = await decode(encoded)

    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded)
    )
  })
})
