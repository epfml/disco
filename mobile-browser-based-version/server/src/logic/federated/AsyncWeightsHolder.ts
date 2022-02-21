
/**
 * The AsyncWeightsHolder class holds and manipulates information about the
 * async weights buffer.
 *
 * @remarks
 * The variables are self explanatory, the class works as follows:
 *
 * At initialization the buffer is empty and the latestWeightsTimeStamp is 0,
 * hence any new weights are accepted during add(weight,weightTimeStamp) so
 * long as weightTimeStamp > 0. Once the buffer
 * is full, we average the weights in the buffer and store it in the weight, we then also
 * update the latestWeightsTimeStamp to the current time.
 *
 * The latest aggregated weights is stored in the weights variable
 */
export class AsyncWeightsHolder {
    taskID: string;
    bufferCapacity: number
    buffer: number[];
    latestWeights: number;
    latestWeightsTimeStamp: number;

    constructor (taskId: string, bufferCapacity: number, initialWeights: number = 0, initialTimeStamp: number = 0) {
      this.taskID = taskId
      this.bufferCapacity = bufferCapacity
      this.buffer = []
      this.latestWeights = initialWeights
      this.latestWeightsTimeStamp = initialTimeStamp
    }

    _resetBuffer () {
      this.buffer = []
    }

    _bufferIsFull (): boolean {
      return this.buffer.length >= this.bufferCapacity
    }

    _aggregateWeightsFromBufferIntoLatestWeights () {
      const bufferLength = this.buffer.length
      this.latestWeights = this.buffer.reduce((partialSum, a) => partialSum + a, 0)
      this.latestWeights = this.latestWeights / bufferLength
    }

    _setLatestWeightsTimeStamp () {
      this.latestWeightsTimeStamp = Date.now()
    }

    _weightsTimeStampIsOutDated (weightsTimeStamp: number) {
      return weightsTimeStamp < this.latestWeightsTimeStamp
    }

    _updateWeightsIfBufferIsFull () {
      if (this._bufferIsFull()) {
        this._aggregateWeightsFromBufferIntoLatestWeights()
        this._setLatestWeightsTimeStamp()
        this._resetBuffer()
      }
    }

    /**
     * Add weights originating from weights of weightsTimeStamp
     * @param weights
     * @param weightTimeStamp
     * @returns true if weights were added, and false otherwise
     */
    add (weights: number, weightTimeStamp: number):boolean {
      if (this._weightsTimeStampIsOutDated(weightTimeStamp)) {
        return false
      }
      this.buffer.push(weights)
      this._updateWeightsIfBufferIsFull()
      return true
    }
}
