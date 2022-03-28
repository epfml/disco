import { AsyncWeightsBuffer } from './async_weights_buffer'

/**
 * @remarks
 * taskID: corresponds to the task that weights correspond to.
 */
export class AsyncWeightsInformant {
    taskID: string;
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

    constructor (taskID: string, asyncWeightsBuffer: AsyncWeightsBuffer) {
      this.taskID = taskID
      this.asyncWeightsBuffer = asyncWeightsBuffer
      this.asyncWeightsBuffer.registerObserver(this)
      this.printAllInfos()
    }

    // Update functions

    update () {
      // DEBUG
      console.log('Before update')
      this.printAllInfos()

      this._updateRound()
      this._updateNumberOfParticipants()

      // DEBUG
      console.log('After update')
      this.printAllInfos()
    }

    _updateRound () {
      this.round = this.asyncWeightsBuffer.round
    }

    _updateNumberOfParticipants () {
      this.currentNumberOfParticipants = this.asyncWeightsBuffer.buffer.size
      this._updateTotalNumberOfParticipants(this.currentNumberOfParticipants)
      this._updateAverageNumberOfParticipants()
    }

    _updateAverageNumberOfParticipants () {
      this.averageNumberOfParticipants = this.totalNumberOfParticipants / this.round
    }

    _updateTotalNumberOfParticipants (currentNumberOfParticipants : number) {
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

    // Future statistics
    getDistanceFromGlobalModel () {}

    getShapleyValueForUser (id) {}

    // Debug

    printAllInfos () {
      console.log('round : ', this.getCurrentRound())
      console.log('participants : ', this.getNumberOfParticipants())
      console.log('total : ', this.getTotalNumberOfParticipants())
      console.log('average : ', this.getAverageNumberOfParticipants())
    }
}
