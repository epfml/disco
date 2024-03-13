import { List, Set, Range } from 'immutable'
import { assert } from 'chai'

import { aggregator as aggregators, aggregation, WeightsContainer } from '@epfml/discojs-core'

describe('secret shares test', function () {
  const epsilon = 1e-4

  const expected = WeightsContainer.of([2, 2, 5, 1], [-10, 10])
  const secrets = List.of(
    WeightsContainer.of([1, 2, 3, -1], [-5, 6]),
    WeightsContainer.of([2, 3, 7, 1], [-10, 5]),
    WeightsContainer.of([3, 1, 5, 3], [-15, 19])
  )

  function buildShares (): List<List<WeightsContainer>> {
    const nodes = Set(secrets.keys()).map(String)
    return secrets.map((secret) => {
      const aggregator = new aggregators.SecureAggregator()
      aggregator.setNodes(nodes)
      return aggregator.generateAllShares(secret)
    })
  }

  function buildPartialSums (allShares: List<List<WeightsContainer>>): List<WeightsContainer> {
    return Range(0, secrets.size)
      .map((idx) => allShares.map((shares) => shares.get(idx)))
      .map((shares) => aggregation.sum(shares as List<WeightsContainer>))
      .toList()
  }

  it('recover secrets from shares', () => {
    const recovered = buildShares().map((shares) => aggregation.sum(shares))
    assert.isTrue(
      (recovered.zip(secrets) as List<[WeightsContainer, WeightsContainer]>).every(([actual, expected]) =>
        actual.equals(expected, epsilon))
    )
  })

  it('derive aggregation result from partial sums', () => {
    const actual = aggregation.avg(buildPartialSums(buildShares()))
    assert.isTrue(actual.equals(expected, epsilon))
  })
})
