import * as tf from '@tensorflow/tfjs'

import { Task } from '@/task'
import { TrainingInformant } from '@/training_informant'

export abstract class Client {
  constructor (
    public readonly serverURL: string,
    public readonly task: Task
  ) {}

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  abstract connect (): Promise<void>

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  abstract disconnect (): Promise<void>

  async getLatestModel (): Promise<tf.LayersModel> {
    const url = this.serverURL.concat(`tasks/${this.task.taskID}/new_weights`)
    return await tf.loadLayersModel(url)
  }

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  abstract onTrainEndCommunication (model: tf.LayersModel, trainingInformant: TrainingInformant): Promise<void>

  /**
   * This function will be called whenever a local round has ended.
   *
   * @param model
   * @param round
   * @param trainingInformant
   */
  abstract onRoundEndCommunication (model: tf.LayersModel, round: number, trainingInformant: TrainingInformant): Promise<void>
}
