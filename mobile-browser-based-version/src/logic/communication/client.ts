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
   * Returns the true if a local round has ended. A round is the number of epochs we locally train
   * before posting our weights on the server. Fractional rounds are allowed, if roundDuration = 1,
   * then we share every epoch.
   */
  _localRoundHasEnded (batch: number, batchSize: number, trainSize: number, roundDuration: number) {
    return batch * batchSize >= trainSize * roundDuration
  }

  /**
   * Returns the true if a local round has started. A round is the number of epochs we locally train
   * before posting our weights on the server. Fractional rounds are allowed, if roundDuration = 1,
   * then we share every epoch.
   */
  _localRoundHasStarted (batch: number, batchSize: number, trainSize: number, roundDuration: number) {
    console.log(((batch - 1) * batchSize) % (trainSize * roundDuration))
    return ((batch - 1) * batchSize) % (trainSize * roundDuration) === 0
  }

  /**
   * TODO: for deai need to also implement!
   */
  async onBatchEndCommunication (model, batch, batchSize, trainSize, roundDuration) {

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
