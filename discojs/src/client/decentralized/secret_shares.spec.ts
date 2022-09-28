import { List } from 'immutable'
// import { assert, expect } from 'chai'

import { aggregation, WeightsContainer } from '../..'
import * as secret_shares from './secret_shares'

const epsilon: number = 0.1

describe('secret shares test', function () {
  // shows additive secret shares implementation with 3 users
  function toyExampleTest (): WeightsContainer {
    const secret1 = WeightsContainer.of([1, 2, 3, -1], [-5, 6]) // secret weight tensors
    const secret2 = WeightsContainer.of([2, 3, 7, 1], [-10, 5])
    const secret3 = WeightsContainer.of([3, 1, 5, 3], [-15, 19])

    const client1shares = secret_shares.generateAllShares(secret1, 3, 100)
    const client2shares = secret_shares.generateAllShares(secret2, 3, 100)
    const client3shares = secret_shares.generateAllShares(secret3, 3, 100)

    const person1shares = List.of(client1shares.first([]), client2shares.first([]), client3shares.first([]))
    const person2shares = List.of(client1shares.rest().first([]), client2shares.rest().first([]), client3shares.rest().first([]))
    const person3shares = List.of(client1shares.last([]), client2shares.last([]), client3shares.last([]))

    const person1partialSum = aggregation.sum(person1shares)
    const person2partialSum = aggregation.sum(person2shares)
    const person3partialSum = aggregation.sum(person3shares)

    const allPartialSums = List.of(person1partialSum, person2partialSum, person3partialSum)
    return aggregation.avg(allPartialSums)
  }

  it('testing secret shares accuracy', async () => {
    const expected = WeightsContainer.of([2, 2, 5, 1], [-10, 10])
    const result = toyExampleTest()

    aggregation.assertWeightsEqual(expected, result, epsilon)
  })
})
