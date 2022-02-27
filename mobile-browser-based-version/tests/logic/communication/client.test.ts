import { expect } from 'chai'

import { Client } from '../../../src/logic/communication/client'

const mockUrl = ''
const mockTask = ''

const client = new Client(mockUrl, mockTask)

const roundDurationIsOne = [
  // batch, batchSize, trainSize, roundDuration, epoch
  { values: [2, 5, 10, 1, 0], output: true },
  { values: [2, 5, 10, 1, 1], output: true },
  { values: [0, 5, 10, 1, 0], output: false },
  { values: [1, 5, 10, 1, 0], output: false }
]

const roundDurationLessThanOne = [
  // batch, batchSize, trainSize, roundDuration, epoch
  { values: [5, 1, 10, 0.5, 0], output: true },
  { values: [10, 1, 10, 0.5, 0], output: true },
  { values: [5, 1, 10, 0.55, 0], output: true },
  { values: [12, 1, 10, 0.6, 0], output: true },
  { values: [2, 1, 10, 0.3, 1], output: true },
  { values: [2, 1, 10, 0.3, 1], output: true },
  { values: [3, 1, 10, 0.3, 0], output: true }
]

const roundDurationGreaterThanOne = [
  // batch, batchSize, trainSize, roundDuration, epoch
  { values: [5, 1, 10, 1.5, 1], output: true },
  { values: [5, 1, 10, 1.5, 4], output: true },
  { values: [4, 1, 10, 1.5, 1], output: false },
  { values: [5, 1, 10, 1.5, 0], output: false }
]

describe('Client test: _numberOfBatchesInAnEpoch', () => {
  it('Simple test', () => {
    let batchSize = 5
    let trainSize = 10
    expect(client._numberOfBatchesInAnEpoch(trainSize, batchSize)).equal(2)
    // Titanic example
    batchSize = 4
    trainSize = 10
    expect(client._numberOfBatchesInAnEpoch(trainSize, batchSize)).equal(3)
  })
})

describe('Client test: _localRoundHasEnded', () => {
  it('Case: roundDuration == 1', () => {
    roundDurationIsOne.forEach((example) => {
      expect(client._localRoundHasEnded(example.values[0], example.values[1], example.values[2], example.values[3], example.values[4])).equal(example.output)
    })
  })
  it('Case: roundDuration < 1', () => {
    roundDurationLessThanOne.forEach((example) => {
      expect(client._localRoundHasEnded(example.values[0], example.values[1], example.values[2], example.values[3], example.values[4])).equal(example.output)
    })
  })
  it('Case: roundDuration > 1', () => {
    roundDurationGreaterThanOne.forEach((example) => {
      expect(client._localRoundHasEnded(example.values[0], example.values[1], example.values[2], example.values[3], example.values[4])).equal(example.output)
    })
  })
})
