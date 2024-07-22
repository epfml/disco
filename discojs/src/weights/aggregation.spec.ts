import { assert } from 'chai'

import { WeightsContainer, aggregation } from './index.js'

describe('weights aggregation', () => {
  it('avg of weights with two operands', () => {
    const expected = aggregation.avg([
      WeightsContainer.of([1, 2, 3, -1], [-5, 6]),
      WeightsContainer.of([2, 3, 7, 1], [-10, 5]),
      WeightsContainer.of([3, 1, 5, 3], [-15, 19])
    ])
    const actual = WeightsContainer.of([2, 2, 5, 1], [-10, 10])

    assert.isTrue(expected.equals(actual))
  })

  it('sum of weights with two operands', () => {
    const expected = aggregation.sum([
      [[3, -4], [9]],
      [[2, 13], [0]]
    ])
    const actual = WeightsContainer.of([5, 9], [9])

    assert.isTrue(expected.equals(actual))
  })

  it('diff of weights with two operands', () => {
    const expected = aggregation.diff([
      [[3, -4, 5], [9, 1]],
      [[2, 13, 4], [0, 1]]
    ])
    const actual = WeightsContainer.of([1, -17, 1], [9, 0])

    assert.isTrue(expected.equals(actual))
  })

  it('avg of weights with no operands throws an error', () => {
    assert.throws(() => aggregation.avg([]))
  })

  it('sum of weights with no operands throws an error', () => {
    assert.throws(() => aggregation.sum([]))
  })

  it('diff of weights with no operands throws an error', () => {
    assert.throws(() => aggregation.diff([]))
  })

  it('avg of weights with different dimensions throws an error', () => {
    assert.throws(() => aggregation.avg([
      [[3, -4], [9]],
      [[2, 13, 4], [0, 1]]
    ]))
  })

  it('sum of weights with different dimensions throws an error', () => {
    assert.throws(() => aggregation.sum([
      [[3, -4], [9]],
      [[2, 13, 4], [0, 1]]
    ]))
  })

  it('diff of weights with different dimensions throws an error', () => {
    assert.throws(() => aggregation.diff([
      [[3, -4], [9]],
      [[2, 13, 4], [0, 1]]
    ]))
  })


})
