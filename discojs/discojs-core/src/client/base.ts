import { Set } from 'immutable'
import axios from 'axios'

import { tf, Task, TrainingInformant, serialization, WeightsContainer } from '..'
import { NodeID } from './types'
import { EventConnection } from './event_connection'
import { Aggregator } from '../aggregator'

export abstract class Base {
  protected _ownId?: NodeID
  protected _server?: EventConnection
  protected aggregationResult?: Promise<WeightsContainer>

  constructor (
    public readonly url: URL,
    public readonly task: Task,
    public readonly aggregator: Aggregator
  ) {}

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  async connect (): Promise<void> {}

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  async disconnect (): Promise<void> {}

  async getLatestModel (): Promise<tf.LayersModel> {
    const url = new URL('', this.url.href)
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/'
    }
    url.pathname += `tasks/${this.task.taskID}/model.json`

    const response = await axios.get(url.href)

    return await serialization.model.decode(response.data)
  }

  async onTrainBeginCommunication (
    weights: WeightsContainer,
    trainingInformant: TrainingInformant
  ): Promise<void> {}

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onTrainEndCommunication (
    weights: WeightsContainer,
    trainingInformant: TrainingInformant
  ): Promise<void> {}

  async onRoundBeginCommunication (
    weights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<void> {}

  /**
   * This function will be called whenever a local round has ended.
   */
  async onRoundEndCommunication (
    weights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<void> {}

  get nodes (): Set<NodeID> {
    return this.aggregator.nodes
  }

  get ownId (): NodeID {
    if (this._ownId === undefined) {
      throw new Error('the node is not connected')
    }
    return this._ownId
  }

  get server (): EventConnection {
    if (this._server === undefined) {
      throw new Error('server undefined, not connected')
    }
    return this._server
  }
}
