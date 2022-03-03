import { expect } from 'chai'

import { RoundTracker } from '../../../src/logic/training/round_tracker'

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

describe('RoundTracker test: _numberOfBatchesInAnEpoch', () => {
  it('Simple test', () => {
    let batchSize = 5
    let trainSize = 10
    expect(RoundTracker.numberOfBatchesInAnEpoch(trainSize, batchSize)).equal(2)
    // Titanic example
    batchSize = 4
    trainSize = 10
    expect(RoundTracker.numberOfBatchesInAnEpoch(trainSize, batchSize)).equal(3)
  })
})

describe('RoundTracker test: _localRoundHasEnded', () => {
  it('Case: roundDuration == 1', () => {
    roundDurationIsOne.forEach((example) => {
      const batch = example.values[0]
      const batchSize = example.values[1]
      const trainSize = example.values[2]
      const roundDuration = example.values[3]
      const epoch = example.values[4]
      const roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
      roundTracker.batch = batch + epoch * roundTracker.numberOfBatchesInAnEpoch
      expect(roundTracker.roundHasEnded()).equal(example.output)
    })
  })
  it('Case: roundDuration < 1', () => {
    roundDurationLessThanOne.forEach((example) => {
      const batch = example.values[0]
      const batchSize = example.values[1]
      const trainSize = example.values[2]
      const roundDuration = example.values[3]
      const epoch = example.values[4]
      const roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
      roundTracker.batch = batch + epoch * roundTracker.numberOfBatchesInAnEpoch
      expect(roundTracker.roundHasEnded()).equal(example.output)
    })
  })
  it('Case: roundDuration > 1', () => {
    roundDurationGreaterThanOne.forEach((example) => {
      const batch = example.values[0]
      const batchSize = example.values[1]
      const trainSize = example.values[2]
      const roundDuration = example.values[3]
      const epoch = example.values[4]
      const roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
      roundTracker.batch = batch + epoch * roundTracker.numberOfBatchesInAnEpoch
      expect(roundTracker.roundHasEnded()).equal(example.output)
    })
  })
})
