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
  async getInitialModelAndRound () {}

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
  abstract onRoundEndCommunication (model, epoch, trainingInformant): Promise<void>

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
