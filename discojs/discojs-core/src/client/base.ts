import axios from 'axios'

import { tf, WeightsContainer, Task, TrainingInformant, serialization } from '..'

export abstract class Base {
  protected connected: boolean = false

  constructor(
    public readonly url: URL,
    public readonly task: Task,
    public displayError: any = undefined,
  ) { }

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  abstract connect(): Promise<void>

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  abstract disconnect(): Promise<void>

  async getLatestModel(): Promise<tf.LayersModel> {
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
  abstract onTrainEndCommunication(weights: WeightsContainer, trainingInformant: TrainingInformant): Promise<void>

  /**
   * This function will be called whenever a local round has ended.
   *
   * @param updatedWeights
   * @param staleWeights
   * @param round
   * @param trainingInformant
   */
  abstract onRoundEndCommunication(
    updatedWeights: WeightsContainer,
    staleWeights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<WeightsContainer>
}
