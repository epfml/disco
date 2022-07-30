import { List } from 'immutable'
import { tf } from '.'

import { averageWeights } from './aggregation'
import * as test from '../src/test_utils.spec'

describe('averaging weights', () => {
  it('aggregation of weights works for two peers', async () => {
    const peersWeights = List.of(
      [tf.tensor([1, -1]), tf.tensor([2])], // TODO: use test_utils or similar to get a weights object directly
      [tf.tensor([3, -3]), tf.tensor([-4])]
    )

    const averaged = averageWeights(peersWeights)

    const expected = test.makeWeights([[2, -2], [-1]])
    test.assertWeightsEqual(averaged, expected, 0) // TODO: adjust for floating point eps
  })
})
