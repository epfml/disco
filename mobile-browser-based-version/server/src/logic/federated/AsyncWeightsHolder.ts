
/**
 * The AsyncWeightsHolder class holds and manipulates information about the
 * async weights buffer.
 *
 * @remarks
 * taskID: corresponds to the task that weights correspond to.
 * bufferCapacity: size of the buffer.
 * buffer: holds a map of users to their added weights.
 * version: the latest version of the weight holder.
 *
 * the class works as follows:
 *
 * At initialization the buffer is empty and the version is 0,
 * hence any new weights are accepted during add(weight,version) so
 * long as version > 0. Once the buffer
 * is full, we average the weights in the buffer and store it in the weight, we then also
 * update the version by incrementing it.
 *
 */
export class AsyncWeightsHolder {
    taskID: string;
    bufferCapacity: number
    buffer: Map<string, any>;
    version: number;
    _aggregateAndStoreWeights: (weights: any) => Promise<void>;

    constructor (taskId: string, bufferCapacity: number, aggregateAndStoreWeights: (weights: any) => Promise<void>) {
      this.taskID = taskId
      this.bufferCapacity = bufferCapacity
      this.buffer = new Map<string, any>()
      this._aggregateAndStoreWeights = aggregateAndStoreWeights
      this.version = 0
    }

    _resetBuffer () {
      this.buffer = new Map<string, any>()
    }

    _bufferIsFull (): boolean {
      return this.buffer.size >= this.bufferCapacity
    }

    _updateVersion () {
      this.version += 1
    }

    _getWeightsFromBuffer () {
      return Array.from(this.buffer.values())
    }

    async _updateWeightsIfBufferIsFull () {
      if (this._bufferIsFull()) {
        this._aggregateAndStoreWeights(this._getWeightsFromBuffer())
        this._updateVersion()
        this._resetBuffer()
      }
    }

    _versionIsOld (version: number) {
      return version < this.version
    }

    /**
     * Add weights originating from weights of a given version.
     * Only add to buffer if the given version is not old.
     * @param weights
     * @param version
     * @returns true if weights were added, and false otherwise
     */
    async add (id: string, weights: number, version: number): Promise<boolean> {
      if (this._versionIsOld(version)) {
        return false
      }
      this.buffer.set(id, weights)
      await this._updateWeightsIfBufferIsFull()
      return true
    }
}
