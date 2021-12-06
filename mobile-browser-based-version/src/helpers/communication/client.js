import * as tf from '@tensorflow/tfjs';


export class Client {
  constructor(serverURL, task) {
    this.serverURL = serverURL;
    this.task = task;
  }

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  async connect() {
    throw new Error('Abstract method');
  }

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  async disconnect() {
    throw new Error('Abstract method');
  }

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onTrainEndCommunication(model, trainingInformant) {
    trainingInformant.addMessage('Training finished.');
  }

  /**
   * The training manager matches this function with the training loop's
   * onEpochBegin callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onEpochBeginCommunication(model, epoch, trainingInformant) {
    return;
  }

  /**
   * The training manager matches this function with the training loop's
   * onEpochEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onEpochEndCommunication() {
    console.log(
      'Training RAM usage is  = ',
      tf.memory().numBytes * 0.000001,
      'MB'
    );
    console.log(
      'Number of allocated tensors  = ',
      tf.memory().numTensors
    );
    return;
  }
}