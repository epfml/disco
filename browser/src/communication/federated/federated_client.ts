import * as msgpack from 'msgpack-lite'

import { Client, Task, TrainingInformant, privacy } from 'discojs'

import { makeID } from '../authentication'
import * as api from './federated_api'
import { Weights } from '@/types'

/**
 * Class that deals with communication with the centralized server when training
 * a specific task in the federated setting.
 */
export class FederatedClient extends Client {
  clientID: string
  peer: any
  modelUpdateIsBasedOnRoundNumber: number

  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {string} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   */
  public constructor (serverURL: string, task: Task) {
    super(serverURL, task)
    this.clientID = ''
    this.modelUpdateIsBasedOnRoundNumber = -1 // The server starts at round 0, in the beginning we are behind
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  public async connect (): Promise<void> {
    /**
     * Create an ID used to connect to the server.
     * The client is now considered as connected and further
     * API requests may be made.
     */
    this.clientID = makeID(10)
    const response = await api.connect(this.task.taskID, this.clientID)
    if (response.status !== 200) {
      throw new Error('connect api')
    }
  }

  /**
   * Disconnection process when user quits the task.
   */
  public async disconnect (): Promise<void> {
    const response = await api.disconnect(this.task.taskID, this.clientID)
    if (response.status !== 200) {
      throw new Error('bad status on disconnect')
    }
  }

  private async postWeightsToServer (weights: Weights): Promise<boolean> {
    const response = await api.postWeights(
      this.task.taskID,
      this.clientID,
      weights,
      this.modelUpdateIsBasedOnRoundNumber
    )
    return response.status === 200
  }

  private async postMetadata (metadataID: string, metadata: string): Promise<boolean> {
    const response = api.postMetadata(
      this.task.taskID,
      this.modelUpdateIsBasedOnRoundNumber,
      this.clientID,
      metadataID,
      metadata
    )
    return (await response).status === 200
  }

  public async getMetadataMap (metadataID: string) {
    const response = await api.getMetadataMap(
      this.task.taskID,
      this.modelUpdateIsBasedOnRoundNumber,
      this.clientID,
      metadataID
    )
    if (response.status === 200) {
      const body = await response.data
      return new Map(msgpack.decode(body[metadataID]))
    } else {
      return new Map()
    }
  }

  public async getLatestServerRound (): Promise<number> {
    const response = await api.getRound(this.task.taskID, this.clientID)

    if (response.status === 200) {
      return response.data.round
    }
    console.log('Error getting weights: code', response.status)
    return -1
  }

  public async fetchRoundAndModelChanges (): Promise<Weights> {
    // Get server round of latest model
    const serverRound = await this.getLatestServerRound()

    const localRoundIsOld = this.modelUpdateIsBasedOnRoundNumber < serverRound
    if (localRoundIsOld) {
      this.modelUpdateIsBasedOnRoundNumber = serverRound
      // Update local model from server
      return await api.getWeights(this.task.taskID, this.clientID)
    } else {
      return undefined
    }
  }

  private async fetchServerStatisticsAndUpdateInformant (trainingInformant: TrainingInformant) {
    const serverStatistics = await api.getAsyncWeightInformantStatistics(this.task.taskID, this.clientID)
    trainingInformant.updateWithServerStatistics(serverStatistics.data.statistics)
  }

  public async onRoundEndCommunication (
    previousRoundWeights: Weights,
    currentRoundWeights: Weights,
    _: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(previousRoundWeights, currentRoundWeights, this.task)
    await this.postWeightsToServer(noisyWeights)
    await this.fetchServerStatisticsAndUpdateInformant(trainingInformant)
    return await this.fetchRoundAndModelChanges() ?? currentRoundWeights
  }

  public async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant) {
    trainingInformant.addMessage('Training finished.')
  }
}
