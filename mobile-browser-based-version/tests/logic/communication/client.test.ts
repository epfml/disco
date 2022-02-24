import { expect } from 'chai'

import { Client } from '../../../src/logic/communication/client'

const mockUrl = ''
const mockTask = ''

const client = new Client(mockUrl, mockTask)

describe('Client test', () => {
  it('_localRoundHasEnded', () => {
    const batch = 10
    const batchSize = 1
    const trainSize = 10
    const roundDuration = 1
    expect(client._localRoundHasEnded(batch, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasEnded(batch + 1, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasEnded(batch - 1, batchSize, trainSize, roundDuration)).false
  })
  it('_localRoundHasEnded', () => {
    const batch = 10
    const batchSize = 1
    const trainSize = 5
    const roundDuration = 2
    expect(client._localRoundHasEnded(batch, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasEnded(batch + 1, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasEnded(batch - 1, batchSize, trainSize, roundDuration)).false
  })
  it('_localRoundHasEnded - fractional', () => {
    const batch = 5
    const batchSize = 1
    const trainSize = 10
    const roundDuration = 0.5
    expect(client._localRoundHasEnded(batch, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasEnded(batch + 1, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasEnded(batch - 1, batchSize, trainSize, roundDuration)).false
  })
  it('_localRoundHasStarted', () => {
    const batch = 1
    const batchSize = 1
    const trainSize = 10
    const roundDuration = 1
    expect(client._localRoundHasStarted(batch, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasStarted((trainSize * roundDuration) + 1, batchSize, trainSize, roundDuration)).true
    expect(client._localRoundHasStarted(batch + 1, batchSize, trainSize, roundDuration)).false
  })
})
