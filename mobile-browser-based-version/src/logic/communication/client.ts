import * as tf from '@tensorflow/tfjs'

export abstract class Client {
  serverURL: any;
  task: any;
  constructor (serverURL, task) {
    this.serverURL = serverURL
    this.task = task
  }

  /**
   * Init holder for federated, we need to fetch latest server round
   * and model before training.
   */
  async init () {}

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  abstract connect (epochs?): Promise<any>

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  abstract disconnect (): void

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  abstract onTrainEndCommunication (model, trainingInformant): Promise<void>

  /**
   * This function will be called whenever a local round has ended.
   *
   * @param model
   * @param batch
   * @param batchSize
   * @param trainSize
   * @param roundDuration
   * @param epoch
   * @param trainingInformant
   */
  abstract onRoundEndCommunication (model, batch, batchSize, trainSize, roundDuration, epoch, trainingInformant): Promise<void>

  /**
   * Callback function for onBatchEnd in TF training callbacks, this will call onRoundEndCommunication whenever a round has ended.
   * @param model
   * @param batch
   * @param batchSize
   * @param trainSize
   * @param roundDuration
   * @param epoch
   * @param trainingInformant
   */
  async onBatchEndCommunication (model, batch, batchSize, trainSize, roundDuration, epoch, trainingInformant) {
    if (this._localRoundHasEnded(batch, batchSize, trainSize, roundDuration, epoch)) {
      console.log('LocalRoundHasEnded')
      this.onRoundEndCommunication(model, batch, batchSize, trainSize, roundDuration, epoch, trainingInformant)
    }
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
  _localRoundHasEnded (batch: number, batchSize: number, trainSize: number, roundDuration: number, epoch: number): boolean {
    if (batch === 0 && epoch === 0) {
      return false
    }
    const numberOfBatchesInAnEpoch = this._numberOfBatchesInAnEpoch(trainSize, batchSize)
    const batchesPerRound = Math.floor(numberOfBatchesInAnEpoch * roundDuration)
    const currentBatchNumberSinceStart = batch + (epoch * numberOfBatchesInAnEpoch)
    return currentBatchNumberSinceStart % batchesPerRound === 0
  }

  /**
   * Return the number of batches in an epoch given train size batch size
   */
  _numberOfBatchesInAnEpoch (dataSize, batchSize) {
    const carryOver = dataSize % batchSize === 0 ? 0 : 1
    return Math.floor(dataSize / batchSize) + carryOver
  }

  /**
   *  Display ram usage
   */
  _logRamUsage () {
    console.log(
      'Training RAM usage is  = ',
      tf.memory().numBytes * 0.000001,
      'MB'
    )
    console.log('Number of allocated tensors  = ', tf.memory().numTensors)
  }
}
