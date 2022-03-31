
import { AsyncWeightsInformant } from '../../../src/logic/federated/async_weights_informant'
import { AsyncWeightsBuffer } from '../../../src/logic/federated/async_weights_buffer'

import { expect } from 'chai'

const taskId = 'titanic'
const bufferCapacity = 3
const weights = [0, 1, 2]

const mockAggregateAndStoreWeights = async (_weights: any) => {}

describe('AsyncWeightInformant tests', () => {
  it('get correct round number', async () => {
    const buffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncWeightsInformant(buffer)
    expect(informant.round).to.eql(0)
    weights.forEach((w) => {
      buffer.add(w.toString(), w, Date.now())
    })
    expect(informant.round).to.eql(1)
  })
  it('get correct number of participants for last round', async () => {
    const buffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncWeightsInformant(buffer)
    weights.forEach((w) => {
      buffer.add(w.toString(), w, Date.now())
    })
    expect(informant.currentNumberOfParticipants).to.eql(bufferCapacity)
  })
  it('get correct average number of participants', async () => {
    const buffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncWeightsInformant(buffer)
    weights.forEach((w) => {
      buffer.add(w.toString(), w, Date.now())
    })
    weights.forEach((w) => {
      buffer.add(w.toString(), w, Date.now())
    })
    expect(informant.averageNumberOfParticipants).to.eql(bufferCapacity)
  })
  it('get correct total number of participants', async () => {
    const buffer = new AsyncWeightsBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncWeightsInformant(buffer)
    weights.forEach((w) => {
      buffer.add(w.toString(), w, Date.now())
    })
    weights.forEach((w) => {
      buffer.add(w.toString(), w, Date.now())
    })
    expect(informant.totalNumberOfParticipants).to.eql(2 * bufferCapacity)
  })
})
