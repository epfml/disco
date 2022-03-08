import * as msgpack from 'msgpack-lite'
import { makeID } from '../authenticator'
import { serializeWeights } from '../tensor_serializer'
import { Client } from '../client'
import { Task } from '@/logic/task_definition/base/task'
import { TrainingInformant } from '@/logic/training/training_informant'
import * as api from './api'
import * as tf from '@tensorflow/tfjs'
/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class FederatedClient extends Client {
  clientID: string;
  peer: any;
  modelUpdateIsBasedOnRoundNumber: number;

  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   * @param {Number} round The training round.
   */
  constructor (serverURL: string, task: Task) {
    super(serverURL, task)
    this.clientID = ''
    this.modelUpdateIsBasedOnRoundNumber = -1 // The server starts at round 0, in the beginning we are behind
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

  async _postWeightsToServer (weights) {
    const encodedWeights = msgpack.encode(
      Array.from(await serializeWeights(weights))
    )
    const response = await api.postWeights(
      this.task.taskID,
      this.clientID,
      encodedWeights,
      this.modelUpdateIsBasedOnRoundNumber
    )
    return response.status === 200
  }

  async postMetadata (metadataID, metadata) {
    const response = api.postMetadata(
      this.task.taskID,
      this.modelUpdateIsBasedOnRoundNumber,
      this.clientID,
      metadataID,
      metadata
    )
    return (await response).status === 200
  }

  async getMetadataMap (metadataID) {
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

  async _getLatestServerRound (): Promise<number> {
    const response = await api.getRound(this.task.taskID, this.clientID)

    if (response.status === 200) {
      return response.data.round
    }
    console.log('Error getting weights: code', response.status)
    return -1
  }

  checkIdentical (a4, b4) {
    for (let i = 0; i < a4.length; ++i) {
      if (a4[i] !== b4[i]) {
        console.log('different')
        return
      }
    }
    console.log('same')
  }

  async _updateLocalModel (model: tf.LayersModel) {
    // get global model from server
    console.log('before ', model.layers[0].weights[0].read().dataSync())
    const b4 = model.layers[0].weights[0].read().dataSync()
    const globalModel = await this.task.createModel()
    console.log('after ', model.layers[0].weights[0].read().dataSync())
    console.log('global ', globalModel.layers[0].weights[0].read().dataSync())
    const a4 = model.layers[0].weights[0].read().dataSync()
    this.checkIdentical(a4, b4)
    this.checkIdentical(a4, globalModel.layers[0].weights[0].read().dataSync())

    // update the model weights
    console.log('Updated local model')
  }

  async _fetchChangesAndUpdateModel (model: tf.LayersModel) {
    // get server round of latest model
    const serverRound = await this._getLatestServerRound()

    const localRoundIsOld = this.modelUpdateIsBasedOnRoundNumber < serverRound
    if (localRoundIsOld) {
      // update local round
      // TODO need to check that update method did not fail!
      this.modelUpdateIsBasedOnRoundNumber = serverRound
      // update local model from server
      await this._updateLocalModel(model)
    }
  }

  async onRoundEndCommunication (model: tf.LayersModel, round: number, trainingInformant: TrainingInformant) {
    await this._postWeightsToServer(model.weights)
    await this._fetchChangesAndUpdateModel(model)
  }

  async onTrainEndCommunication (model: tf.LayersModel, trainingInformant: TrainingInformant) {
    trainingInformant.addMessage('Training finished.')
  }
}
