import * as tf from '@tensorflow/tfjs'

/**
 * Client interface representing the web app's node. Handles communication
 * with any sort of centralized server used throughout the training of a task
 * by the node. Subclasses correspond to specific training schemes, differing
 * in communication processes. Provides a few default methods to subclasses.
 */
export class Client {
  serverURL: any;
  task: any;
  constructor (serverURL, task) {
    this.serverURL = serverURL
    this.task = task
  }

  /**
   * Abstract method. Handles the connection process from the client to any sort of
   * centralized server.
   * @param {number} epochs
   * @throws Throws an error. Meant to be an abstract method and thus
   * overridden by subclasses.
   */
  async connect (epochs?): Promise<any> {
    throw new Error('Abstract method')
  }

  /**
   * Abstract method. Handles the disconnection process of the client from any sort
   * of centralized server.
   * @throws Throws an error, meant to be an abstract method and thus
   * overridden by subclasses.
   */
  disconnect () {
    throw new Error('Abstract method')
  }

  /**
   * Default method. The training manager matches this function with the training loop's
   * onTrainBegin callback when training a TF.js model. See the training manager for more
   * details. Executes a general (communication) routine before the start of the task's
   * training loop.
   * @param {any} model The task's TF.js model
   * @param {any} trainingInformant The task's training informant
   */
  async onTrainBeginCommunication (model, trainingInformant) {

  }

  /**
   * Default method. The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TF.js model. See the training manager for more
   * details. Executes a general (communication) routine before the start of the task's
   * training loop.
   * @param {any} model The task's TF.js model
   * @param {any} trainingInformant The task's training informant
   */
  async onTrainEndCommunication (model, trainingInformant) {
    trainingInformant.addMessage('Training finished.')
  }

  /**
   * Default method. The training manager matches this function with the training loop's
   * onEpochBegin callback when training a TF.js model. See the training manager for more
   * details. Executes a general (communication) routine before the start of each epoch
   * of the task's training loop.
   * @param {any} model The task's TF.js model
   * @param {number} epoch The task's current epoch
   * @param {any} trainingInformant The task's training informant
   */
  async onEpochBeginCommunication (model, epoch, trainingInformant) {

  }

  /**
   * Default method. The training manager matches this function with the training loop's
   * onEpochEnd callback when training a TF.js model. See the training manager for more
   * details. Executes a general (communication) routine after the end of each epoch
   * of the task's training loop.
   * @param {any} model The task's TF.js model
   * @param {number} epoch The task's current epoch
   * @param {any} trainingInformant The task's training informant
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
