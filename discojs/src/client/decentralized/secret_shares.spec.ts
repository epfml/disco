import { List } from 'immutable'
// import { assert, expect } from 'chai'

import { Weights, aggregation } from '../..'
import * as secret_shares from './secret_shares'

import * as test from '../../../src/test_utils.spec'

const epsilon: number = 0.1

describe('secret shares test', function () {
  // shows additive secret shares implementation with 3 users
  function toyExampleTest (): Weights {
    const secret1 = test.makeWeights([[1, 2, 3, -1], [-5, 6]]) // secret weight tensors
    const secret2 = test.makeWeights([[2, 3, 7, 1], [-10, 5]])
    const secret3 = test.makeWeights([[3, 1, 5, 3], [-15, 19]])

    const client1shares = secret_shares.generateAllShares(secret1, 3, 100)
    const client2shares = secret_shares.generateAllShares(secret2, 3, 100)
    const client3shares = secret_shares.generateAllShares(secret3, 3, 100)

    const person1shares = List.of(client1shares.first([]), client2shares.first([]), client3shares.first([]))
    const person2shares = List.of(client1shares.rest().first([]), client2shares.rest().first([]), client3shares.rest().first([]))
    const person3shares = List.of(client1shares.last([]), client2shares.last([]), client3shares.last([]))

    const person1partialSum = aggregation.sumWeights(person1shares)
    const person2partialSum = aggregation.sumWeights(person2shares)
    const person3partialSum = aggregation.sumWeights(person3shares)

    const allPartialSums = List.of(person1partialSum, person2partialSum, person3partialSum)
    return aggregation.averageWeights(allPartialSums)
  }

  it('testing secret shares accuracy', async () => {
    const expected: Weights = test.makeWeights([[2, 2, 5, 1], [-10, 10]])
    const result: Weights = toyExampleTest()

    test.assertWeightsEqual(expected, result, epsilon)
  })
})
