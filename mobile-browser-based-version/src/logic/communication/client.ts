import * as tf from '@tensorflow/tfjs'

export class Client {
  serverURL: any;
  task: any;
  constructor (serverURL, task) {
    this.serverURL = serverURL
    this.task = task
  }

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  async connect (epochs?): Promise<any> {
    throw new Error('Abstract method')
  }

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  disconnect () {
    throw new Error('Abstract method')
  }

  async onTrainBeginCommunication (model, trainingInformant) {

  }

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onTrainEndCommunication (model, trainingInformant) {
    trainingInformant.addMessage('Training finished.')
  }

  /**
   * The training manager matches this function with the training loop's
   * onEpochBegin callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onEpochBeginCommunication (model, epoch, trainingInformant) {

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

  _numberOfBatchesInAnEpoch (trainSize, batchSize) {
    const carryOver = trainSize % batchSize === 0 ? 0 : 1
    return Math.floor(trainSize / batchSize) + carryOver
  }

  /**
   * TODO: for deai need to also implement!
   */
  async onBatchEndCommunication (model, batch, batchSize, trainSize, roundDuration, epoch) {
  }

  /**
   * The training manager matches this function with the training loop's
   * onEpochEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onEpochEndCommunication (model?, epoch?, trainingInformant?) {
    console.log(
      'Training RAM usage is  = ',
      tf.memory().numBytes * 0.000001,
      'MB'
    )
    console.log('Number of allocated tensors  = ', tf.memory().numTensors)
  }
}
