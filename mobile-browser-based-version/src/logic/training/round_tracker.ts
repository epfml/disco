/**
 * Class that keeps track of everything round related.
 *
 * @remark
 * A round is unit of time measured in epochs. The client wishes to share his weights with the
 * server every r rounds. If r = 1.5 that means every 1.5 epochs, the onBatchEnd(batch, log) callback function
 * of TF .fit is used to know when a round is done. Since the given batch in onBatchEnd is not cumulative, i.e.
 * it is 0 after an epoch is done, we need to keep track of the current epoch in training to compute the
 * currentBatchNumberSinceStart which is required in order to know if a round is done.
 *
 */
export class RoundTracker {
    round: number;
    epoch: number;
    roundDuration: number;
    numberOfBatchesInAnEpoch: number

    constructor (roundDuration: number, trainSize: number, batchSize: number, epoch: number = 0) {
      this.round = 0
      this.epoch = epoch
      this.roundDuration = roundDuration
      this.numberOfBatchesInAnEpoch = RoundTracker.numberOfBatchesInAnEpoch(trainSize, batchSize)

      console.log(`RoundTracker: roundDuration: ${roundDuration}, nb batches in an epoch ${this.numberOfBatchesInAnEpoch}`)
    }

    /**
   * Returns true if a local round has ended, false otherwise.
   *
   * @remark
   * Batch is the current batch, this goes from 1, ... , batchSize*trainSize.
   * Epoch is the current epoch, this goes from 0, 1, ... m
   *
   * Returns true if (the current batch number since start) mod (batches per round) == 0, false otherwise
   *
   * E.g if there are 1000 samples in total, and roundDuration is
   * 2.5, withBatchSize 100, then if batch is a multiple of 25, the local round has ended.
   *
   */
    roundHasEnded (batch: number): boolean {
      if (batch === 0 && this.epoch === 0) {
        return false
      }
      const batchesPerRound = Math.floor(this.numberOfBatchesInAnEpoch * this.roundDuration)
      const currentBatchNumberSinceStart = batch + (this.epoch * this.numberOfBatchesInAnEpoch)
      const roundHasEnded = currentBatchNumberSinceStart % batchesPerRound === 0
      if (roundHasEnded) {
        this.round += 1
        console.log('Round has ended.')
      }
      return roundHasEnded
    }

    /**
     * To be called at onEpochEnd in order to keep track of the current epoch
     */
    updateEpoch () {
      this.epoch += 1
    }

    /**
   * Return the number of batches in an epoch given train size batch size
   */
    static numberOfBatchesInAnEpoch (trainSize: number, batchSize: number) {
      const carryOver = trainSize % batchSize === 0 ? 0 : 1
      return Math.floor(trainSize / batchSize) + carryOver
    }
}
