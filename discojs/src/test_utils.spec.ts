import * as tf from '@tensorflow/tfjs'
import { assert } from 'chai'

import { Weights } from '..'
import * as secret_shares from './client/decentralized/secret_shares'

export function assertWeightsEqual (w1: Weights, w2: Weights, epsilon: number = 0): void {
  const differenceBetweenWeights: Weights = secret_shares.subtractWeights(w1, w2)
  for (const t of differenceBetweenWeights) {
    assert.strictEqual(
      tf.lessEqual(t.abs(), epsilon).all().dataSync()[0],
      1
    )
  }
}

export function makeWeights (values: any): Weights {
  const w: Weights = []
  for (const v of values) {
    w.push(tf.tensor(v))
  }
  return w
}
