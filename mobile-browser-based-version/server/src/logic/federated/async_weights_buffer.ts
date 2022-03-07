
/**
 * The AsyncWeightsBuffer class holds and manipulates information about the
 * async weights buffer. It works as follows:
 *
 * Setup: Init round to zero and create empty buffer (a map from user id to weights)
 *
 * - When a user adds weights only do so when they are recent weights: i.e. this.round - round <= roundCutoff.
 * - If a user already added weights, update them. (-> there can be at most one entry of weights per id in a buffer).
 * - When the buffer is full, call aggregateAndStoreWeights with the weights in the buffer and then increment round by one  and reset the buffer.
 *
 * @remarks
 * taskID: corresponds to the task that weights correspond to.
 * bufferCapacity: size of the buffer.
 * buffer: holds a map of users to their added weights.
 * round: the latest round of the weight buffer.
 * roundCutoff: cutoff for accepted rounds.
 */
export class AsyncWeightsBuffer {
    taskID: string;
    bufferCapacity: number
    buffer: Map<string, any>;
    round: number;
    roundCutoff: number;
    _aggregateAndStoreWeights: (weights: any) => Promise<void>;

    constructor (taskID: string, bufferCapacity: number, aggregateAndStoreWeights: (weights: any) => Promise<void>, roundCutoff: number = 0) {
      this.taskID = taskID
      this.bufferCapacity = bufferCapacity
      this.buffer = new Map<string, any>()
      this._aggregateAndStoreWeights = aggregateAndStoreWeights
      this.roundCutoff = roundCutoff
      this.round = 0
    }

    _resetBuffer () {
      this.buffer.clear()
    }

    _bufferIsFull (): boolean {
      return this.buffer.size >= this.bufferCapacity
    }

    _updateRound () {
      this.round += 1
    }

    _getWeightsFromBuffer () {
      return Array.from(this.buffer.values())
    }

    async _updateWeightsIfBufferIsFull () {
      if (this._bufferIsFull()) {
        this._aggregateAndStoreWeights(this._getWeightsFromBuffer())
        this._updateRound()
        this._resetBuffer()
        console.log('\n************************************************************')
        console.log(`Buffer is full; Aggregating weights and starting round: ${this.round}\n`)
      }
    }

    _isNotWithinRoundCutoff (round: number) {
      // Note that always this.round >= round
      return this.round - round > this.roundCutoff
    }

    /**
     * Add weights originating from weights of a given round.
     * Only add to buffer if the given round is not old.
     * @param weights
     * @param round
     * @returns true if weights were added, and false otherwise
     */
    async add (id: string, weights: number, round: number): Promise<boolean> {
      if (this._isNotWithinRoundCutoff(round)) {
        console.log(`Did not add weights of ${id} to buffer. Due to old round update: ${round}, current round is ${this.round}`)
        return false
      }
      const weightsUpdatedByUser = this.buffer.has(id)
      const msg = weightsUpdatedByUser ? '\tUpdating' : '-> Adding new'
      console.log(`${msg} weights of ${id} to buffer.`)
      this.buffer.set(id, weights)
      await this._updateWeightsIfBufferIsFull()
      return true
    }
}
