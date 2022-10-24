import { WeightsContainer } from '..'

import { Base } from './base'

// does pretty much nothing
export class Local extends Base {
  async connect (): Promise<void> {}
  async disconnect (): Promise<void> {}

  async onRoundEndCommunication (_: WeightsContainer): Promise<WeightsContainer> {
    return _
  }

  async onTrainEndCommunication (): Promise<void> {}
}
