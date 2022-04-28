import * as tf from '@tensorflow/tfjs'
import { assert } from 'chai'

import { serialization } from '.'

describe('serialization', () => {
  it('can deserialize what it serializes', async () => {
    const raw = [1, 2, 3]
    const weights = raw.map((r) => tf.tensor(r))

    const serialized = await serialization.serializeWeights(weights)
    assert.isTrue(serialization.isSerializedWeights(serialized))

    const deserialized = serialization.deserializeWeights(serialized)

    assert.sameDeepOrderedMembers(
      Array.from(
        (await Promise.all(
          deserialized.map(async (w) => await w.data<'float32'>()))
        ).entries()
      ),
      Array.from(
        raw.map((r) => Float32Array.of(r)).entries()
      )
    )
  })
})
