/**
 * Class that keeps track of the current batch in order for the trainer to query when round has ended.
 *
 * @remark
 * In distributed training, the client trains locally for a certain amount of epochs before sharing his weights to the server/neighbor, this
 * is what we call a round. A round is measured in epochs (1 round == 1 epoch), a round can be any number > 0, if roundDuration = 0.5, then
 * every half epoch we share our weights with the server.
 *
 * The role of the RoundTracker is to keep track of when a roundHasEnded using the current batch number. The batch in the RoundTracker is cumulative whereas
 * in the onBatchEnd it is not (it resets to 0 after each epoch).
 */
export class RoundTracker {
    round: number = 0;
    batch: number = 0;
    roundDuration: number;
    numberOfBatchesInAnEpoch: number
    batchesPerRound: number

    constructor (roundDuration: number, trainSize: number, batchSize: number) {
      this.roundDuration = roundDuration
      this.numberOfBatchesInAnEpoch = RoundTracker.numberOfBatchesInAnEpoch(trainSize, batchSize)
      this.batchesPerRound = Math.floor(this.numberOfBatchesInAnEpoch * this.roundDuration)

      console.log(`RoundTracker: roundDuration: ${roundDuration}, nb batches in an epoch ${this.numberOfBatchesInAnEpoch}`)
    }

    /**
     * Update the batch number, to be called inside onBatchEnd. (We do not use batch output of onBatchEnd since it is
     * not cumulative).
     */
    updateBatch () {
      this.batch += 1
    }

    /**
   * Returns true if a local round has ended, false otherwise.
   *
   * @remark
   * Returns true if (batch) mod (batches per round) == 0, false otherwise
   *
   * E.g if there are 1000 samples in total, and roundDuration is
   * 2.5, withBatchSize 100, then if batch is a multiple of 25, the local round has ended.
   *
   */
    roundHasEnded (): boolean {
      if (this.batch === 0) {
        return false
      }

      const roundHasEnded = this.batch % this.batchesPerRound === 0
      if (roundHasEnded) {
        this.round += 1
        console.log('Round has ended.')
      }
      return roundHasEnded
    }

    /**
   * Return the number of batches in an epoch given train size batch size
   */
    static numberOfBatchesInAnEpoch (trainSize: number, batchSize: number) {
      const carryOver = trainSize % batchSize === 0 ? 0 : 1
      return Math.floor(trainSize / batchSize) + carryOver
    }
}
