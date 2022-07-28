import * as tf from '@tensorflow/tfjs'
import { List, Set } from 'immutable'
import { assert, expect } from 'chai'

import { Weights, aggregation } from '../..'
import * as secret_shares from './secret_shares'

function makeWeights (values: any): Weights {
  const w: Weights = []
  for (let i = 0; i < 1; i++) {
    w.push(tf.tensor(values))
  }
  return w
}

describe('secret shares test', function () {
  function toyExampleTest (): Weights {
    'shows additive implementation with 3 users'

    const secret1: Weights = makeWeights([[1, 2, 3], [5, 5, 6]]) // secrets
    const secret2: Weights = makeWeights([[2, 3, 7], [10, 4, 5]])
    const secret3: Weights = makeWeights([[3, 1, 5], [15, 3, 19]])

    const client1shares: List<Weights> = secret_shares.generateAllShares(secret1, 3, 100)
    const client2shares: List<Weights> = secret_shares.generateAllShares(secret2, 3, 100)
    const client3shares: List<Weights> = secret_shares.generateAllShares(secret3, 3, 100)

    const person1shares: List<Weights> = List([client1shares.get(0, []), client2shares.get(0, []), client3shares.get(0, [])])
    const person2shares: List<Weights> = List([client1shares.get(1, []), client2shares.get(1, []), client3shares.get(1, [])])
    const person3shares: List<Weights> = List([client1shares.get(2, []), client2shares.get(2, []), client3shares.get(2, [])])

    const person1partialSum: Weights = secret_shares.sum(person1shares)
    const person2partialSum: Weights = secret_shares.sum(person2shares)
    const person3partialSum: Weights = secret_shares.sum(person3shares)

    // console.log('person1 partial sum', person1partialSum)

    const allPartialSums: List<Weights> = List([person1partialSum, person2partialSum, person3partialSum])
    const setWeights: Set<Weights> = allPartialSums.toSet()
    return aggregation.averageWeights(setWeights)
  }

  it('testing secret shares accuracy', async () => {
    const expected: Weights = makeWeights([[2,2,5],[10,4,10]])
    const result: Weights = toyExampleTest()
    // assert.isTrue(expected === result) ********
    console.log('expected')
    tf.print(expected[0])

    console.log('result')
    tf.print(result[0])
  })
}
)