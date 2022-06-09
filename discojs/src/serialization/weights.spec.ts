import * as tf from '@tensorflow/tfjs'
import { assert } from 'chai'

import { encode, decode, isEncoded, Encoded } from './weights'

describe('weights', () => {
  it('can encode what it decodes', async () => {
    const raw = [1, 2, 3]
    const weights = raw.map((r) => tf.tensor(r))

    const encoded: Encoded = await encode(weights)
    assert.isTrue(isEncoded(encoded))
    const decoded = decode(encoded)

    assert.sameDeepOrderedMembers(
      Array.from(
        (await Promise.all(
          decoded.map(async (w) => await w.data<'float32'>()))
        ).entries()
      ),
      Array.from(
        raw.map((r) => Float32Array.of(r)).entries()
      )
    )
  })
})
