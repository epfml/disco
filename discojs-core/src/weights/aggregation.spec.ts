import { WeightsContainer, aggregation } from '@epfml/discojs-node'

describe('averaging weights', () => {
  it('aggregation of weights works for two peers', async () => {
    const actual = aggregation.avg([
      [[1, -1], [2]],
      [[3, -3], [-4]]
    ])

    const expected = WeightsContainer.of([2, -2], [-1])
    aggregation.assertWeightsEqual(actual, expected, 0) // TODO: adjust for floating point eps
  })

  it('test aggregation sum weights', async () => {
    const actual = aggregation.sum([
      [[3, -4], [9]],
      [[2, 13], [0]]
    ])

    const expected = WeightsContainer.of([5, 9], [9])
    aggregation.assertWeightsEqual(actual, expected, 0) // TODO: adjust for floating point eps
  })

  it('test aggregation subtract weights', async () => {
    const actual = aggregation.diff([
      [[3, -4, 5], [9, 1]],
      [[2, 13, 4], [0, 1]]
    ])

    const expected = WeightsContainer.of([1, -17, 1], [9, 0])
    aggregation.assertWeightsEqual(actual, expected, 0) // TODO: adjust for floating point eps
  })
})
