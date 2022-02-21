
import { AsyncWeightsHolder } from '../../../src/logic/federated/AsyncWeightsHolder'
import { expect } from 'chai'

const taskId = 'titanic'
const bufferCapacity = 3
const weights = [0, 1, 2]
const averageWeights = weights.reduce((partialSum, a) => partialSum + a, 0) / weights.length

describe('AsyncWightHandler tests', () => {
  it('add weight with old time stamp returns false', () => {
    const t0 = -1 //
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity)
    expect(asyncWeightHolder.add(weights[0], t0)).false
  })
  it('add weight with recent time stamp returns true', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity)
    const t0 = Date.now()
    expect(asyncWeightHolder.add(weights[0], t0)).true
  })
  it('_bufferIsFull returns false if it is not full', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity)
    expect(asyncWeightHolder._bufferIsFull()).false
  })
  it('Adding bufferCapacity with recent time stamp lunches aggregator', () => {
    const asyncWeightHolder = new AsyncWeightsHolder(taskId, bufferCapacity)
    const t0 = Date.now()
    weights.forEach((w) => {
      asyncWeightHolder.add(w, t0)
    })
    expect(asyncWeightHolder.latestWeights).equal(averageWeights)
    expect(asyncWeightHolder.buffer.length).equal(0)
  })
})
