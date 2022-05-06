import { AsyncBuffer } from './async_buffer'

export class AsyncInformant<T> {
  private round = 0
  private currentNumberOfParticipants = 0
  private totalNumberOfParticipants = 0
  private averageNumberOfParticipants = 0

  constructor (
    private readonly asyncBuffer: AsyncBuffer<T>
  ) {
    this.asyncBuffer.registerObserver(this)
  }

  // Update functions

  update (): void {
    // DEBUG
    console.log('Before update')
    this.printAllInfos()

    this.updateRound()
    this.updateNumberOfParticipants()

    // DEBUG
    console.log('After update')
    this.printAllInfos()
  }

  private updateRound (): void {
    this.round = this.asyncBuffer.round
  }

  private updateNumberOfParticipants (): void {
    this.currentNumberOfParticipants = this.asyncBuffer.buffer.size
    this.updateTotalNumberOfParticipants(this.currentNumberOfParticipants)
    this.updateAverageNumberOfParticipants()
  }

  private updateAverageNumberOfParticipants (): void {
    this.averageNumberOfParticipants = this.totalNumberOfParticipants / this.round
  }

  private updateTotalNumberOfParticipants (currentNumberOfParticipants: number): void {
    this.totalNumberOfParticipants += currentNumberOfParticipants
  }

  // Getter functions
  getCurrentRound (): number {
    return this.round
  }

  getNumberOfParticipants (): number {
    return this.currentNumberOfParticipants
  }

  getTotalNumberOfParticipants (): number {
    return this.totalNumberOfParticipants
  }

  getAverageNumberOfParticipants (): number {
    return this.averageNumberOfParticipants
  }

  getAllStatistics (): Record<'round' | 'currentNumberOfParticipants' | 'totalNumberOfParticipants' | 'averageNumberOfParticipants', number> {
    return {
      round: this.getCurrentRound(),
      currentNumberOfParticipants: this.getNumberOfParticipants(),
      totalNumberOfParticipants: this.getTotalNumberOfParticipants(),
      averageNumberOfParticipants: this.getAverageNumberOfParticipants()
    }
  }

  // Debug

  printAllInfos (): void {
    console.log('task : ', this.asyncBuffer.taskID)
    console.log('round : ', this.getCurrentRound())
    console.log('participants : ', this.getNumberOfParticipants())
    console.log('total : ', this.getTotalNumberOfParticipants())
    console.log('average : ', this.getAverageNumberOfParticipants())
  }
}
