import { Weights } from '@/types'
import { Client } from '../client'
import { Task } from '../task'

// does pretty much nothing
export class LocalClient extends Client {
  constructor (task: Task) {
    super('local://', task)
  }

  async connect (): Promise<void> {}
  async disconnect (): Promise<void> {}

  async onRoundEndCommunication (_: Weights): Promise<Weights> { return _ }
  async onTrainEndCommunication (): Promise<void> {}
}
