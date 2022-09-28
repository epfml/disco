import { List } from 'immutable'
import { tf } from '.'

import * as aggregation from './aggregation'
import * as test from '../src/test_utils.spec'
import { assert } from 'chai'

describe('averaging weights', () => {
  it('aggregation of weights works for two peers', async () => {
    const peersWeights = List.of(
      [tf.tensor([1, -1]), tf.tensor([2])], // TODO: use test_utils or similar to get a weights object directly
      [tf.tensor([3, -3]), tf.tensor([-4])]
    )

    const averaged = aggregation.averageWeights(peersWeights)

    const expected = test.makeWeights([[2, -2], [-1]])
    test.assertWeightsEqual(averaged, expected, 0) // TODO: adjust for floating point eps
  })

  it('test aggregation sum weights', async () => {
    const peersWeights = List.of(
      [tf.tensor([3, -4]), tf.tensor([9])], // TODO: use test_utils or similar to get a weights object directly
      [tf.tensor([2, 13]), tf.tensor([0])]
    )

    const summed = aggregation.sumWeights(peersWeights)

    const expected = test.makeWeights([[5, 9], [9]])
    test.assertWeightsEqual(summed, expected, 0) // TODO: adjust for floating point eps
  })

  it('test aggregation subtract weights', async () => {
    const peersWeights = List.of(
      [tf.tensor([3, -4, 5]), tf.tensor([9, 1])], // TODO: use test_utils or similar to get a weights object directly
      [tf.tensor([2, 13, 4]), tf.tensor([0, 1])]
    )

    const difference = aggregation.subtractWeights(peersWeights)

    const expected = test.makeWeights([[1, -17, 1], [9, 0]])
    test.assertWeightsEqual(difference, expected, 0) // TODO: adjust for floating point eps
  })

  it('works even with duplicated values', async () => {
    const peersWeights = List.of(
      [tf.tensor([1])], // TODO: use test_utils or similar to get a weights object directly
      [tf.tensor([1])],
      [tf.tensor([4])]
    )
    assert.strictEqual(peersWeights.size, 3)

    const averaged = aggregation.averageWeights(peersWeights)

    const expected = test.makeWeights([[2]])
    test.assertWeightsEqual(averaged, expected, 0) // TODO: adjust for floating point eps
  })
})
