import * as tf from '@tensorflow/tfjs'
import { Task } from '../task_definition/base/task'
import { TrainingInformant } from '../training/training_informant'

export abstract class Client {
  serverURL: string;
  task: Task;
  constructor (serverURL: string, task: Task) {
    this.serverURL = serverURL
    this.task = task
  }

  /**
   * Init holder for federated, we need to fetch latest server round
   * and model before training.
   */
  async updateModelAndRoundFromServer () {}

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  abstract connect (epochs?:number): Promise<any>

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  abstract disconnect (): Promise<any>

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  abstract onTrainEndCommunication (model, trainingInformant: TrainingInformant): Promise<void>

  /**
   * This function will be called whenever a local round has ended.
   *
   * @param model
   * @param round
   * @param trainingInformant
   */
  abstract onRoundEndCommunication (model, round: number, trainingInformant: TrainingInformant): Promise<void>

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
