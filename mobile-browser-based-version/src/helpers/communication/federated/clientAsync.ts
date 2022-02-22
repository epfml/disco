import * as msgpack from 'msgpack-lite'
import { makeID, serializeWeights } from '../helpers'
import { Client } from '../client'
import * as api from './api'

/**
 * TODO: When should you update the timeStamp:
 * - Model fetch
 * - Latest locally trained model?
 */

/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class FederatedAsyncClient extends Client {
  clientID: string;
  peer: any;
  timeStamp: number;
  // TODO how to adapt round?
  round: number;

  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   * @param {Number} round The training round.
   */
  constructor (serverURL, task) {
    super(serverURL, task)
    this.clientID = ''
    this.timeStamp = -1 // Ensure that our model is out of date if we query
    this.round = 0
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  async connect () {
    /**
     * Create an ID used to connect to the server.
     * The client is now considered as connected and further
     * API requests may be made.
     */
    this.clientID = makeID(10)
    const response = await api.connect(this.task.taskID, this.clientID)
    return response.status === 200
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect () {
    const response = await api.disconnect(this.task.taskID, this.clientID)
    return response.status === 200
  }

  async postWeights (weights) {
    const encodedWeights = msgpack.encode(
      Array.from(await serializeWeights(weights))
    )
    const response = await api.postAsyncWeights(
      this.task.taskID,
      this.clientID,
      encodedWeights,
      this.timeStamp
    )
    this._updateTimeStamp()
    return response.status === 200
  }

  async postMetadata (metadataID, metadata) {
    const response = api.postMetadata(
      this.task.taskID,
      this.round,
      this.clientID,
      metadataID,
      metadata
    )
    return (await response).status === 200
  }

  async getMetadataMap (metadataID) {
    const response = await api.getMetadataMap(
      this.task.taskID,
      this.round,
      this.clientID,
      metadataID
    )
    if (response.status === 200) {
      // TODO: test
      const body = await response.data
      return new Map(msgpack.decode(body[metadataID]))
    } else {
      return new Map()
    }
  }

  _updateTimeStamp () {
    this.timeStamp = Date.now()
  }

  async _weightsAreOutOfDate (): Promise<boolean> {
    console.log('Fetching are weights out of date?')
    const response = await api.getIsVersionOld(this.task.taskID, this.clientID, this.timeStamp)

    if (response.status === 200) {
      return response.data.isTimeStampOutOfDate
    }
    console.log('Error getting weights: code', response.status)
    return false
  }

  _updateLocalModelWithMostRecentServerModel () {
    // TODO: naming is not good, seems like you are just creating + only do so if it is more recent.
    this.task.createModel()
    console.log('Updated local model')
  }

  async onEpochBeginCommunication (model, epoch, trainingInformant) {
    await super.onEpochBeginCommunication(model, epoch, trainingInformant)
    const weightsAreOutOfDate = await this._weightsAreOutOfDate()
    console.log('Epoch begin')
    console.log('weightsAreOutOfDate', weightsAreOutOfDate)
    if (weightsAreOutOfDate) {
      // update local model from server
      this._updateLocalModelWithMostRecentServerModel()
    }
  }

  async onEpochEndCommunication (model, epoch, trainingInformant) {
    await super.onEpochEndCommunication(model, epoch, trainingInformant)
    /**
     * Once the training round is completed, send local weights to the
     * server for aggregation.
     */
    this._updateTimeStamp()
    await this.postWeights(model.weights)

    const weightsAreOutOfDate = await this._weightsAreOutOfDate()
    console.log('Epoch end')
    console.log('weightsAreOutOfDate', weightsAreOutOfDate)
    if (weightsAreOutOfDate) {
      // update local model from server
      this._updateLocalModelWithMostRecentServerModel()
    }
  }
}
