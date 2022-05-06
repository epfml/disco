
import { AsyncInformant } from '../src/async_informant'
import { AsyncBuffer } from '../src/async_buffer'

import { expect } from 'chai'

const taskId = 'titanic'
const bufferCapacity = 3
const weights = [0, 1, 2]

// eslint-disable-next-line @typescript-eslint/no-empty-function
const mockAggregateAndStoreWeights = async (): Promise<void> => {}

describe('AsyncInformant tests', () => {
  it('get correct round number', async () => {
    const buffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncInformant(buffer)
    expect(informant.getCurrentRound()).to.eql(0)
    await Promise.all(weights.map(async (w) => await buffer.add(w.toString(), w, Date.now())))
    expect(informant.getCurrentRound()).to.eql(1)
  })
  it('get correct number of participants for last round', async () => {
    const buffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncInformant(buffer)
    await Promise.all(weights.map(async (w) => await buffer.add(w.toString(), w, Date.now())))
    expect(informant.getNumberOfParticipants()).to.eql(bufferCapacity)
  })
  it('get correct average number of participants', async () => {
    const buffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncInformant(buffer)
    await Promise.all(weights.map(async (w) => await buffer.add(w.toString(), w, Date.now())))
    await Promise.all(weights.map(async (w) => await buffer.add(w.toString(), w, Date.now())))
    expect(informant.getAverageNumberOfParticipants()).to.eql(bufferCapacity)
  })
  it('get correct total number of participants', async () => {
    const buffer = new AsyncBuffer(taskId, bufferCapacity, mockAggregateAndStoreWeights)
    const informant = new AsyncInformant(buffer)
    await Promise.all(weights.map(async (w) => await buffer.add(w.toString(), w, Date.now())))
    await Promise.all(weights.map(async (w) => await buffer.add(w.toString(), w, Date.now())))
    expect(informant.getTotalNumberOfParticipants()).to.eql(2 * bufferCapacity)
  })
})
