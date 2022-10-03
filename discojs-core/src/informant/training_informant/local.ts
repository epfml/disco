import { TaskID } from '@/task'
import { Base } from '.'

export class LocalInformant extends Base {
  constructor (taskID: TaskID, nbrMessagesToShow: number) {
    super(taskID, nbrMessagesToShow)

    this.currentNumberOfParticipants = 1
    this.averageNumberOfParticipants = 1
    this.totalNumberOfParticipants = 1
  }

  update (statistics: Record<string, number>): void {
    this.currentRound = statistics.currentRound
  }
}
