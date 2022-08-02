import { List } from 'immutable'
// import { assert, expect } from 'chai'

import { Weights, aggregation } from '../..'
import * as secret_shares from './secret_shares'

import * as test from '../../../src/test_utils.spec'

const epsilon: number = 0.1

describe('secret shares test', function () {
  function toyExampleTest (): Weights {
    'shows additive secret shares implementation with 3 users'

    const secret1: Weights = test.makeWeights([[1, 2, 3, -1], [-5, 6]]) // secret weight tensors
    const secret2: Weights = test.makeWeights([[2, 3, 7, 1], [-10, 5]])
    const secret3: Weights = test.makeWeights([[3, 1, 5, 3], [-15, 19]])

    const client1shares: List<Weights> = secret_shares.generateAllShares(secret1, 3, 100)
    const client2shares: List<Weights> = secret_shares.generateAllShares(secret2, 3, 100)
    const client3shares: List<Weights> = secret_shares.generateAllShares(secret3, 3, 100)

    const person1shares: List<Weights> = List([client1shares.get(0, []), client2shares.get(0, []), client3shares.get(0, [])])
    const person2shares: List<Weights> = List([client1shares.get(1, []), client2shares.get(1, []), client3shares.get(1, [])])
    const person3shares: List<Weights> = List([client1shares.get(2, []), client2shares.get(2, []), client3shares.get(2, [])])

    const person1partialSum: Weights = aggregation.sumWeights(person1shares)
    const person2partialSum: Weights = aggregation.sumWeights(person2shares)
    const person3partialSum: Weights = aggregation.sumWeights(person3shares)

    const allPartialSums: List<Weights> = List([person1partialSum, person2partialSum, person3partialSum])
    return aggregation.averageWeights(allPartialSums)
  }

  it('testing secret shares accuracy', async () => {
    const expected: Weights = test.makeWeights([[2, 2, 5, 1], [-10, 10]])
    const result: Weights = toyExampleTest()

    test.assertWeightsEqual(expected, result, epsilon)
  })
}
)
