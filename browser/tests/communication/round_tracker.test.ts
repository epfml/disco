import { expect } from 'chai'

import { RoundTracker } from '../../src/training/trainer/round_tracker'

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

  it('round ended true when ended', () => {
    const roundTracker = new RoundTracker(roundDuration)
    roundTracker.updateBatch()
    roundTracker.updateBatch()
    expect(roundTracker.roundHasEnded()).equal(true)
  })
})
