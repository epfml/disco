
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
    buffer: any[];
    latestWeightsTimeStamp: number;
    _aggregateAndStoreWeights: (weights: any) => Promise<void>;

    constructor (taskId: string, bufferCapacity: number, aggregateAndStoreWeights: (weights: any) => Promise<void>, initialTimeStamp: number = 0) {
      this.taskID = taskId
      this.bufferCapacity = bufferCapacity
      this.buffer = []
      this._aggregateAndStoreWeights = aggregateAndStoreWeights
      this.latestWeightsTimeStamp = initialTimeStamp
    }

    _resetBuffer () {
      this.buffer = []
    }

    _bufferIsFull (): boolean {
      return this.buffer.length >= this.bufferCapacity
    }

    _setLatestWeightsTimeStamp () {
      this.latestWeightsTimeStamp = Date.now()
    }

    _weightsTimeStampIsOutDated (weightsTimeStamp: number) {
      return weightsTimeStamp < this.latestWeightsTimeStamp
    }

    async _updateWeightsIfBufferIsFull () {
      if (this._bufferIsFull()) {
        this._aggregateAndStoreWeights(this.buffer)
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
    async add (weights: number, weightTimeStamp: number): Promise<boolean> {
      if (this._weightsTimeStampIsOutDated(weightTimeStamp)) {
        return false
      }
      // TODO: add id to each weight (to check if they already pushed)
      this.buffer.push(weights)
      await this._updateWeightsIfBufferIsFull()
      return true
    }
}
