import * as tf from '@tensorflow/tfjs'
import { List, Set } from 'immutable'
import { assert, expect } from 'chai'

import { Weights, aggregation } from '..'
import * as secret_shares from './client/decentralized/secret_shares'

export function assertWeightsEqual(w1: Weights, w2:Weights, epsilon: number = 0) {
  for (let t of secret_shares.subtractWeights(w1, w2)) {
    assert.strictEqual(
        tf.lessEqual(t.abs(), epsilon).all().dataSync()[0],
        1
    )
  }
}

export function makeWeights (values: number[][]): Weights {
  const w: Weights = []
  for (let v of values) {
    w.push(tf.tensor(v))
  }
  return w
}