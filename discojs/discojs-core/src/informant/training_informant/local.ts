import type { Task } from '../../index.js'

import { Base } from './index.js'

export class LocalInformant extends Base {
  constructor (task: Task, nbrMessagesToShow?: number) {
    super(task, nbrMessagesToShow)

    this.currentNumberOfParticipants = 1
    this.averageNumberOfParticipants = 1
    this.totalNumberOfParticipants = 1
  }

  update (statistics: Record<string, number>): void {
    this.currentRound = statistics.currentRound
  }
}
