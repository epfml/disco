import { assert, expect } from 'chai'

import { AsyncBuffer } from './async_buffer'

const taskId = 'titanic'
const id = 'a'
const bufferCapacity = 3
const weights = [0, 1, 2]
const newWeights = [3, 4, 5]
let mockUpdatedWeights: number[] = []

async function mockAggregateAndStoreWeights (_weights: number[]): Promise<void> {
  mockUpdatedWeights = _weights
}

describe('AsyncWeightBuffer tests', () => {
  it('add weight with old time stamp returns false', async () => {
    const t0 = -1
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    assert.isFalse(await asyncWeightBuffer.add(id, weights[0], t0))
  })
  it('add weight with recent time stamp returns true', async () => {
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    assert.isTrue(await asyncWeightBuffer.add(id, weights[0], t0))
  })
  it('_bufferIsFull returns false if it is not full', () => {
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    assert.isFalse(asyncWeightBuffer.bufferIsFull())
  })
  it('buffer adding with cutoff = 0', () => {
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    assert.isFalse(asyncWeightBuffer.isNotWithinRoundCutoff(0))
    assert.isTrue(asyncWeightBuffer.isNotWithinRoundCutoff(-1))
  })
  it('buffer adding with different cutoff = 1', () => {
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights, 1)
    assert.isFalse(asyncWeightBuffer.isNotWithinRoundCutoff(0))
    assert.isFalse(asyncWeightBuffer.isNotWithinRoundCutoff(-1))
    assert.isTrue(asyncWeightBuffer.isNotWithinRoundCutoff(-2))
  })
  it('Adding enough weight to buffer lunches aggregator and updates weights', async () => {
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const t0 = Date.now()
    await Promise.all(weights.map(async (w) => await asyncWeightBuffer.add(w.toString(), w, t0)))
    expect(asyncWeightBuffer.buffer.size).equal(0)
    expect(weights).to.eql(mockUpdatedWeights)
    expect(asyncWeightBuffer.round).equal(1)
  })
  it('Testing two full cycles (adding x2 buffer capacity)', async () => {
    const asyncWeightBuffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    mockUpdatedWeights = []

    const t0 = Date.now()
    await Promise.all(weights.map(async (w) => await asyncWeightBuffer.add(w.toString(), w, t0)))
    expect(weights).to.eql(mockUpdatedWeights)

    const t1 = Date.now()
    await Promise.all(newWeights.map(async (w) => await asyncWeightBuffer.add(w.toString(), w, t1)))
    expect(newWeights).to.eql(mockUpdatedWeights)
    expect(asyncWeightBuffer.round).equal(2)
  })
})
