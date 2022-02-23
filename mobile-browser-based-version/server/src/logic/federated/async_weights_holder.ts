
/**
 * The AsyncWeightsHolder class holds and manipulates information about the
 * async weights buffer.
 *
 * @remarks
 * taskID: corresponds to the task that weights correspond to.
 * bufferCapacity: size of the buffer.
 * buffer: holds a map of users to their added weights.
 * round: the latest round of the weight holder.
 *
 * the class works as follows:
 *
 * At initialization the buffer is empty and the round is 0,
 * hence any new weights are accepted during add(weight,round) so
 * long as round > 0. Once the buffer
 * is full, we average the weights in the buffer and store it in the weight, we then also
 * update the round by incrementing it.
 *
 */
export class AsyncWeightsHolder {
    taskID: string;
    bufferCapacity: number
    buffer: Map<string, any>;
    round: number;
    _aggregateAndStoreWeights: (weights: any) => Promise<void>;

    constructor (taskID: string, bufferCapacity: number, aggregateAndStoreWeights: (weights: any) => Promise<void>) {
      this.taskID = taskID
      this.bufferCapacity = bufferCapacity
      this.buffer = new Map<string, any>()
      this._aggregateAndStoreWeights = aggregateAndStoreWeights
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

    _roundIsOld (round: number) {
      return round < this.round
    }

    /**
     * Add weights originating from weights of a given round.
     * Only add to buffer if the given round is not old.
     * @param weights
     * @param round
     * @returns true if weights were added, and false otherwise
     */
    async add (id: string, weights: number, round: number): Promise<boolean> {
      if (this._roundIsOld(round)) {
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
