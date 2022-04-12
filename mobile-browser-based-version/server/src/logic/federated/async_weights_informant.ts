import { AsyncWeightsBuffer } from './async_weights_buffer'

export class AsyncWeightsInformant {
    asyncWeightsBuffer: AsyncWeightsBuffer

    // This could rapidly grow so we should have some way to do garbage collection ?
    // This could be interesting for measures based on gradient history
    // Maybe we could have some sort of observer on the buffer
    // so everytime we aggregate, we store the history
    bufferHistory: Map<number, Map<string, any>>

    round: number = 0
    currentNumberOfParticipants: number = 0
    totalNumberOfParticipants: number = 0
    averageNumberOfParticipants : number = 0

    constructor (asyncWeightsBuffer: AsyncWeightsBuffer) {
      this.asyncWeightsBuffer = asyncWeightsBuffer
      this.asyncWeightsBuffer.registerObserver(this)
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
      this.round = this.asyncWeightsBuffer.round
    }

    private updateNumberOfParticipants () {
      this.currentNumberOfParticipants = this.asyncWeightsBuffer.buffer.size
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

    // Future statistics
    getDistanceFromGlobalModel (id) {}

    getShapleyValueForUser (id) {}

    // Debug

    printAllInfos () {
      console.log('task : ', this.asyncWeightsBuffer.taskID)
      console.log('round : ', this.getCurrentRound())
      console.log('participants : ', this.getNumberOfParticipants())
      console.log('total : ', this.getTotalNumberOfParticipants())
      console.log('average : ', this.getAverageNumberOfParticipants())
    }
}
