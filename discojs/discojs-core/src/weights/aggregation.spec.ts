import { assert } from 'chai'

import { WeightsContainer, aggregation } from './index.js'

describe('weights aggregation', () => {
  it('avg of weights with two operands', () => {
    const actual = aggregation.avg([
      WeightsContainer.of([1, 2, 3, -1], [-5, 6]),
      WeightsContainer.of([2, 3, 7, 1], [-10, 5]),
      WeightsContainer.of([3, 1, 5, 3], [-15, 19])
    ])
    const expected = WeightsContainer.of([2, 2, 5, 1], [-10, 10])

    assert.isTrue(actual.equals(expected))
  })

  it('sum of weights with two operands', () => {
    const actual = aggregation.sum([
      [[3, -4], [9]],
      [[2, 13], [0]]
    ])
    const expected = WeightsContainer.of([5, 9], [9])

    assert.isTrue(actual.equals(expected))
  })

  it('diff of weights with two operands', () => {
    const actual = aggregation.diff([
      [[3, -4, 5], [9, 1]],
      [[2, 13, 4], [0, 1]]
    ])
    const expected = WeightsContainer.of([1, -17, 1], [9, 0])

    assert.isTrue(actual.equals(expected))
  })
})
