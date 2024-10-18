import { assert } from 'chai'

import { WeightsContainer, serialization } from '../index.js'

describe('weights', () => {
  it('can encode what it decodes', async () => {
    const weights = WeightsContainer.of([1], [2], [3])

    const encoded = await serialization.weights.encode(weights)
    assert.isTrue(serialization.isEncoded(encoded))
    const decoded = serialization.weights.decode(encoded)

    assert.sameDeepOrderedMembers(
      Array.from(
        (await Promise.all(
          decoded.weights.map(async (w) => await w.data<'float32'>()))
        ).entries()
      ),
      Array.from(
        (await Promise.all(
          weights.weights.map(async (w) => await w.data<'float32'>()))
        ).entries()
      )
    )
  })
})
