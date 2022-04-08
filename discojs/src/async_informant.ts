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

    update () {
      // DEBUG
      console.log('Before update')
      this.printAllInfos()

      this.updateRound()
      this.updateNumberOfParticipants()

      // DEBUG
      console.log('After update')
      this.printAllInfos()
    }

    private updateRound () {
      this.round = this.asyncBuffer.round
    }

    private updateNumberOfParticipants () {
      this.currentNumberOfParticipants = this.asyncBuffer.buffer.size
      this.updateTotalNumberOfParticipants(this.currentNumberOfParticipants)
      this.updateAverageNumberOfParticipants()
    }

    private updateAverageNumberOfParticipants () {
      this.averageNumberOfParticipants = this.totalNumberOfParticipants / this.round
    }

    private updateTotalNumberOfParticipants (currentNumberOfParticipants : number) {
      this.totalNumberOfParticipants += currentNumberOfParticipants
    }

    // Getter functions
    getCurrentRound () {
      return this.round
    }

    getNumberOfParticipants () {
      return this.currentNumberOfParticipants
    }

    getTotalNumberOfParticipants () {
      return this.totalNumberOfParticipants
    }

    getAverageNumberOfParticipants () {
      return this.averageNumberOfParticipants
    }

    getAllStatistics () {
      return {
        round: this.getCurrentRound(),
        currentNumberOfParticipants: this.getNumberOfParticipants(),
        totalNumberOfParticipants: this.getTotalNumberOfParticipants(),
        averageNumberOfParticipants: this.getAverageNumberOfParticipants()
      }
    }

    // Debug

    printAllInfos () {
      console.log('task : ', this.asyncBuffer.taskID)
      console.log('round : ', this.getCurrentRound())
      console.log('participants : ', this.getNumberOfParticipants())
      console.log('total : ', this.getTotalNumberOfParticipants())
      console.log('average : ', this.getAverageNumberOfParticipants())
    }
}
