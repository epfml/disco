import { assert } from 'chai'
import { Set } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { averageWeights } from '../../src/core/aggregation'

describe('averaging weights', () => {
  it('works for two peers', async () => {
    const peersWeights = Set.of(
      [tf.tensor([1]), tf.tensor([2])],
      [tf.tensor([3]), tf.tensor([4])]
    )

    const averaged = await averageWeights(peersWeights)

    assert.lengthOf(averaged, 2)
    const readAverage = await Promise.all(
      averaged.map(async (t: tf.Tensor) => {
        const array = await t.data()
        assert.lengthOf(array, 1)
        return array[0]
      }))
    assert.sameOrderedMembers(readAverage, [1.5, 3.5])
  })
})
