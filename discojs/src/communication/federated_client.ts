import * as msgpack from 'msgpack-lite'
import * as tf from '@tensorflow/tfjs'
import axios from 'axios'

import { serialization, Weights, Client, Task, TrainingInformant, MetadataID } from '..'

import { makeID } from './authentication'
/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class FederatedClient extends Client {
  clientID: string
  peer: any
  private round: number

  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   */
  constructor (serverURL: string, task: Task) {
    super(serverURL, task)
    this.clientID = ''
    this.round = -1 // The server starts at round 0, in the beginning we are behind
  }

  private urlTo (category: string): string {
    return [
      this.serverURL,
      category,
      this.task.taskID,
      this.clientID
    ].join('/')
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  async connect (): Promise<void> {
    /**
     * Create an ID used to connect to the server.
     * The client is now considered as connected and further
     * API requests may be made.
     */
    this.clientID = makeID(10)

    await axios.get(this.urlTo('connect'))
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    await axios.get(this.urlTo('disconnect'))
  }

  private async postWeightsToServer (weights: Weights): Promise<void> {
    await axios({
      method: 'post',
      url: this.urlTo('weights'),
      data: {
        weights: await serialization.encodeWeights(weights),
        round: this.round
      }
    })
  }

  async postMetadata (metadataID: string, metadata: string): Promise<void> {
    await axios({
      method: 'post',
      url: `${this.serverURL}/metadata/${metadataID}/${this.task.taskID}/${this.round}/${this.clientID}`,
      data: {
        metadataID: metadata
      }
    })
  }

  async getMetadataMap (metadataID: MetadataID): Promise<Map<string, unknown>> {
    const response = await axios.get(`${this.serverURL}/metadata/${metadataID}/${this.task.taskID}/${this.round}/${this.clientID}`)

    const body = await response.data
    return new Map(msgpack.decode(body[metadataID]))
  }

  async getLatestServerRound (): Promise<number> {
    const response = await axios.get(this.urlTo('round'))

    if (response.status === 200) {
      return response.data.round
    }
    console.log('Error getting weights: code', response.status)
    return -1
  }

  private async updateLocalModel (model: tf.LayersModel): Promise<void> {
    // get latest model from the server
    const response = await axios.get(this.urlTo('weights'))
    const weights = serialization.decodeWeights(response.data)
    model.setWeights(weights)

    console.log('Updated local model')
  }

  private async fetchChangesAndUpdateModel (model: tf.LayersModel): Promise<void> {
    // get server round of latest model
    const serverRound = await this.getLatestServerRound()

    const localRoundIsOld = this.round < serverRound
    if (localRoundIsOld) {
      this.round = serverRound
      // update local model from server
      await this.updateLocalModel(model)
    }
  }

  async fetchServerStatisticsAndUpdateInformant (trainingInformant: TrainingInformant): Promise<void> {
    const response = await axios.get(this.urlTo('statistics'))
    trainingInformant.updateWithServerStatistics(response.data.statistics)
  }

  async onRoundEndCommunication (model: tf.LayersModel, _: number, trainingInformant: TrainingInformant): Promise<void> {
    await this.postWeightsToServer(model.weights.map((w) => w.read()))
    await this.fetchChangesAndUpdateModel(model)
    await this.fetchServerStatisticsAndUpdateInformant(trainingInformant)
  }

  async onTrainEndCommunication (_: tf.LayersModel, trainingInformant: TrainingInformant): Promise<void> {
    trainingInformant.addMessage('Training finished.')
  }
}
