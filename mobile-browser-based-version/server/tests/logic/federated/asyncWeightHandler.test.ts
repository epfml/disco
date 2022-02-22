
import { AsyncWeightsHolder } from '../../../src/logic/federated/AsyncWeightsHolder'
import { expect } from 'chai'

const taskId = 'titanic'
const id = 'a'
const bufferCapacity = 3
const weights = [0, 1, 2]
const newWeights = [3, 4, 5]
let mockUpdatedWeights = []

const mockAggregateAndStoreWeights = async (_weights: any) => {
  mockUpdatedWeights = _weights
}

describe('AsyncWeightHandler tests', () => {
  it('add weight with old time stamp returns false', async () => {
    const t0 = -1 //
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(await asyncWeightHolder.add(id, weights[0], t0)).false
  })
  it('add weight with recent time stamp returns true', async () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    expect(await asyncWeightHolder.add(id, weights[0], t0)).true
  })
  it('_bufferIsFull returns false if it is not full', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(asyncWeightHolder._bufferIsFull()).false
  })
  it('Adding enough weight to buffer lunches aggregator', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    weights.forEach((w) => {
      asyncWeightHolder.add(w.toString(), w, t0)
    })
    expect(weights).to.eql(mockUpdatedWeights)
    expect(asyncWeightHolder.version).equal(1)
  })
  it('Adding enough weight to buffer lunches aggregator - trying twice', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    mockUpdatedWeights = []

    const t0 = Date.now()
    weights.forEach((w) => {
      asyncWeightHolder.add(w.toString(), w, t0)
    })
    expect(weights).to.eql(mockUpdatedWeights)

    const t1 = Date.now()
    newWeights.forEach((w) => {
      asyncWeightHolder.add(w.toString(), w, t1)
    })
    expect(newWeights).to.eql(mockUpdatedWeights)
  })
})
