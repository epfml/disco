import { expect } from 'chai'

import { RoundTracker } from './round_tracker.js'

const roundDuration = 2

describe('RoundTracker test:', () => {
  it('at init false', () => {
    const roundTracker = new RoundTracker(roundDuration)
    expect(roundTracker.roundHasEnded()).equal(false)
  })
  it('before round ended false', () => {
    const roundTracker = new RoundTracker(roundDuration)
    roundTracker.updateBatch()
    expect(roundTracker.roundHasEnded()).equal(false)
  })

  it('round number iterated', () => {
    const roundTracker = new RoundTracker(roundDuration)
    expect(roundTracker.round).equal(0)
    roundTracker.updateBatch()
    roundTracker.updateBatch()
    // roundHasEnded() called in trainer.ts for Trainer.onBatchEnd()
    roundTracker.roundHasEnded()
    expect(roundTracker.round).equal(1)
  })

  it('round ended true when ended', () => {
    const roundTracker = new RoundTracker(roundDuration)
    roundTracker.updateBatch()
    roundTracker.updateBatch()
    expect(roundTracker.roundHasEnded()).equal(true)
  })
})
