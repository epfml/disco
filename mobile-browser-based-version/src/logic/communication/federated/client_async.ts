import * as msgpack from 'msgpack-lite'
import { makeID } from '../authenticator'
import { serializeWeights } from '../tensor_serializer'
import { Client } from '../client'
import * as api from './api'

/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class FederatedAsyncClient extends Client {
  clientID: string;
  peer: any;
  round: number;

  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   * @param {Number} round The training round.
   */
  constructor (serverURL, task) {
    super(serverURL, task)
    console.log('building Federated Async client')
    this.clientID = ''
    this.round = -1 // The server starts at round 0, in the beginning we are behind
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
      this.round
    )
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
      const body = await response.data
      return new Map(msgpack.decode(body[metadataID]))
    } else {
      return new Map()
    }
  }

  async _getServerRound (): Promise<number> {
    const response = await api.getAsyncRound(this.task.taskID, this.clientID)

    if (response.status === 200) {
      return response.data.round
    }
    console.log('Error getting weights: code', response.status)
    return -1
  }

  _updateLocalModelWithMostRecentServerModel () {
  // TODO: naming is not good, seems like you are just creating + only do so if it is more recent.
  //! !!!!
    this.task.createModel()
    console.log('Updated local model')
  }

  async onEpochBeginCommunication (model, epoch, trainingInformant) {
    await super.onEpochBeginCommunication(model, epoch, trainingInformant)

    // Check for latest round in server, if it is new, update weights.
    await this._update()
  }

  async _update () {
    // get server round of latest model
    const serverRound = await this._getServerRound()

    const localRoundIsOld = this.round < serverRound
    if (localRoundIsOld) {
      // update local round
      // TODO need to check that update method did not fail!
      this.round = serverRound
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
    await this.postWeights(model.weights)
  }
}
