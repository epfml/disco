import { assert } from 'chai'
import { Set } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { averageWeights } from './aggregation'

describe('averaging weights', () => {
  it('works for two peers', async () => {
    const peersWeights = Set.of(
      [tf.tensor([1]), tf.tensor([2])],
      [tf.tensor([3]), tf.tensor([4])]
    )

    const averaged = averageWeights(peersWeights)

    assert.sameDeepOrderedMembers(
      Array.from(
        (await Promise.all(
          averaged.map(async (t) => await t.data<'float32'>()))
        ).entries()
      ),
      Array.from(
        [2, 3].map((e) => Float32Array.of(e)).entries()
      )
    )
  })
})
