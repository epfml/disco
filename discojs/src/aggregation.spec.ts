import { Set } from 'immutable'
import { tf } from '.'

import { averageWeights } from './aggregation'
import * as test from '../src/test_utils.spec'

describe('averaging weights', () => {
  it('works for two peers', async () => {
    const peersWeights = Set.of(
      [tf.tensor([1]), tf.tensor([2])],
      [tf.tensor([3]), tf.tensor([4])]
    )

    const averaged = averageWeights(peersWeights)

    const expected = test.makeWeights([[2], [3]])
    test.assertWeightsEqual(averaged, expected, 0)
  })
})
