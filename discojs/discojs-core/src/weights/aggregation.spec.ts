import { assert } from 'chai'

import { tf, WeightsContainer, aggregation } from '@epfml/discojs-node'

describe('averaging weights', () => {
  it('aggregation of weights works for two peers', async () => {
    const actual = aggregation.avg([
      [[1, -1], [2]],
      [[3, -3], [-4]]
    ])

    const expected = WeightsContainer.of([2, -2], [-1])
    assertWeightsEqual(actual, expected, 0) // TODO: adjust for floating point eps
  })

  it('test aggregation sum weights', async () => {
    const actual = aggregation.sum([
      [[3, -4], [9]],
      [[2, 13], [0]]
    ])

    const expected = WeightsContainer.of([5, 9], [9])
    assertWeightsEqual(actual, expected, 0) // TODO: adjust for floating point eps
  })

  it('test aggregation subtract weights', async () => {
    const actual = aggregation.diff([
      [[3, -4, 5], [9, 1]],
      [[2, 13, 4], [0, 1]]
    ])

    const expected = WeightsContainer.of([1, -17, 1], [9, 0])
    assertWeightsEqual(actual, expected, 0) // TODO: adjust for floating point eps
  })
})

// TODO: implement equal in WeightsContainer
export function assertWeightsEqual (w1: WeightsContainer, w2: WeightsContainer, epsilon: number = 0): void {
  // Inefficient because we wait for each layer to completely load before we start loading the next layer
  // when using tf.Tensor.dataSync() in a for loop. Could be made more efficient by using Promise.all().
  // Not worth making more efficient, because this function is only used for testing, where tf.Tensors are small.
  for (const t of w1.sub(w2).weights) {
    assert.strictEqual(
      tf.lessEqual(t.abs(), epsilon).all().dataSync()[0],
      1
    )
  }
}
