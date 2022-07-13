import { Base } from '.'

export class DecentralizedInformant extends Base {
  update (statistics: Record<string, number>): void {
    this.currentRound += 1
    this.currentNumberOfParticipants = statistics.currentNumberOfParticipants
    this.totalNumberOfParticipants += this.currentNumberOfParticipants
    this.averageNumberOfParticipants = this.totalNumberOfParticipants / this.currentRound
  }

  isDecentralized (): boolean {
    return true
  }
}
