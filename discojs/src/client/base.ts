import axios from 'axios'
import * as tf from '@tensorflow/tfjs'

import * as serialization from '../serialization'
import { Task } from '@/task'
import { TrainingInformant } from '@/informant/training_informant'
import { Weights } from '@/types'

export abstract class Base {
  constructor (
    public readonly url: URL,
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
    const url = new URL('', this.url.href)
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/'
    }
    url.pathname += `tasks/${this.task.taskID}/model.json`

    const response = await axios.get(url.href)

    return await serialization.model.decode(response.data)
  }

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  abstract onTrainEndCommunication (weights: Weights, trainingInformant: TrainingInformant): Promise<void>

  /**
   * This function will be called whenever a local round has ended.
   *
   * @param updatedWeights
   * @param staleWeights
   * @param round
   * @param trainingInformant
   */
  abstract onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights>
}
