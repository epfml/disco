
import { AsyncWeightsHolder } from '../../../src/logic/federated/AsyncWeightsHolder'
import { expect } from 'chai'

const taskId = 'titanic'
const bufferCapacity = 3
const weights = [0, 1, 2]
let mockUpdatedWeights = []

const mockAggregateAndStoreWeights = async (_weights: any) => {
  mockUpdatedWeights = _weights
}

describe('AsyncWightHandler tests', () => {
  it('add weight with old time stamp returns false', async () => {
    const t0 = -1 //
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(await asyncWeightHolder.add(weights[0], t0)).false
  })
  it('add weight with recent time stamp returns true', async () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    expect(await asyncWeightHolder.add(weights[0], t0)).true
  })
  it('_bufferIsFull returns false if it is not full', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(asyncWeightHolder._bufferIsFull()).false
  })
  it('Adding bufferCapacity with recent time stamp lunches aggregator', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    weights.forEach((w) => {
      asyncWeightHolder.add(w, t0)
    })
    expect(weights).to.eql(mockUpdatedWeights)
  })
})
