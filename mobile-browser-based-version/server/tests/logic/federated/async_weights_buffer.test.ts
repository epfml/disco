
import { AsyncWeightsBuffer } from '../../../src/logic/federated/async_weights_buffer'
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

describe('AsyncWeightBuffer tests', () => {
  it('add weight with old time stamp returns false', async () => {
    const t0 = -1
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(await asyncWeightBuffer.add(id, weights[0], t0)).false
  })
  it('add weight with recent time stamp returns true', async () => {
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    expect(await asyncWeightBuffer.add(id, weights[0], t0)).true
  })
  it('_bufferIsFull returns false if it is not full', () => {
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(asyncWeightBuffer._bufferIsFull()).false
  })
  it('buffer adding with cutoff = 0', () => {
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    expect(asyncWeightBuffer._isNotWithinRoundCutoff(0)).false
    expect(asyncWeightBuffer._isNotWithinRoundCutoff(-1)).true
  })
  it('buffer adding with different cutoff = 1', () => {
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights, 1)
    expect(asyncWeightBuffer._isNotWithinRoundCutoff(0)).false
    expect(asyncWeightBuffer._isNotWithinRoundCutoff(-1)).false
    expect(asyncWeightBuffer._isNotWithinRoundCutoff(-2)).true
  })
  it('Adding enough weight to buffer lunches aggregator and updates weights', () => {
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    weights.forEach((w) => {
      asyncWeightBuffer.add(w.toString(), w, t0)
    })
    expect(asyncWeightBuffer.buffer.size).equal(0)
    expect(weights).to.eql(mockUpdatedWeights)
    expect(asyncWeightBuffer.round).equal(1)
  })
  it('Testing two full cycles (adding x2 buffer capacity)', () => {
    const asyncWeightBuffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    mockUpdatedWeights = []

    const t0 = Date.now()
    weights.forEach((w) => {
      asyncWeightBuffer.add(w.toString(), w, t0)
    })
    expect(weights).to.eql(mockUpdatedWeights)

    const t1 = Date.now()
    newWeights.forEach((w) => {
      asyncWeightBuffer.add(w.toString(), w, t1)
    })
    expect(newWeights).to.eql(mockUpdatedWeights)
    expect(asyncWeightBuffer.round).equal(2)
  })
})
