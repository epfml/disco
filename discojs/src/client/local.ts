import { Weights } from '../types'
import { Task } from '../task'

import { Base } from './base'

// does pretty much nothing
export class Local extends Base {
  constructor (task: Task) {
    super(new URL('local://'), task)
  }

  async connect (): Promise<void> {}
  async disconnect (): Promise<void> {}

  async onRoundEndCommunication (_: Weights): Promise<Weights> { return _ }
  async onTrainEndCommunication (): Promise<void> {}
}
