import * as msgpack from 'msgpack-lite'
import { makeID, serializeWeights } from '../helpers'
import { getSuccessfulResponse } from './helpers'
import { Client } from '../client'
import * as api from './api'

/**
 * The waiting time between performing requests to the centralized server.
 * Expressed in milliseconds.
 */
const TIME_PER_TRIES = 1000
/**
 * The maximum number of tries before stopping to perform requests.
 */
const MAX_TRIES = 30

// TODO should we import this interface from the server?
interface SelectionStatus {
  selected: number;
  round: number;
}

interface AggregationStatus {
  aggregated: boolean;
}

/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class FederatedClient extends Client {
  clientID: string;
  round: number;
  peer: any;
  selected: boolean;

  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   * @param {Number} round The training round.
   */
  constructor (serverURL, task) {
    super(serverURL, task)
    this.clientID = ''
    this.round = 0
    this.selected = false
  }

  /**
   * Initializes the connection to the centralized server via its API.
   * @returns The connection request's status code.
   */
  async connect () {
    /**
     * Create an ID used to connect to the server.
     * The client is now considered as connected and further API requests may be made.
     */
    this.clientID = makeID(10)
    const response = await api.connect(this.task.taskID, this.clientID)
    return response.status === 200
  }

  /**
   * Notify the centralized server via its API that the client left the task.
   * @returns The disconnection request's status code.
   */
  async disconnect () {
    const response = await api.disconnect(this.task.taskID, this.clientID)
    return response.status === 200
  }

  /**
   * Requests the centralized server via its API to select this client for the
   * upcoming round.
   * @returns The selection request's status code.
   */
  async selectionStatus () {
    const response = await api.selectionStatus(this.task.taskID, this.clientID)
    // TODO: test
    return response.status === 200 ? await response.data.json() : undefined
  }

  /**
   * Requests the aggregated weights from the centralized server via its API,
   * for the given round
   * @returns The aggregated weights or undefined if the request failed
   */
  async aggregationStatus () {
    const response = await api.aggregationStatus(
      this.task.taskID,
      this.round,
      this.clientID
    )
    return response.status === 200 ? await response.data.json() : undefined
  }

  /**
   * Sends the client's local weights to the centralized server via its API.
   * @param weights The local weights to be sent
   * @returns The request's status code
   */
  async postWeights (weights) {
    const encodedWeights = msgpack.encode(
      Array.from(await serializeWeights(weights))
    )
    const response = await api.postWeights(
      this.task.taskID,
      this.round,
      this.clientID,
      encodedWeights
    )
    return response.status === 200
  }

  /**
   * Sends the client's given metadata to the centralized server via its API.
   * @param metadataID The metadata's ID
   * @param metadata The metadata's content
   * @returns The request's status code
   */
  async postMetadata (metadataID, metadata) {
    const response = await api.postMetadata(
      this.task.taskID,
      this.round,
      this.clientID,
      metadataID,
      metadata
    )
    return response.status === 200
  }

  /**
   * Fetches the given metadata from the centralized server via its API.
   * @param metadataID The metadata's ID
   * @returns The request's status code
   */
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

  /**
   * On the start of each round of the task's training loop, perform the required
   * communication routine with the centralized server. Requests the server to select
   * this client, or move to aggregation phase if the selection phase has already ended
   * and the requested round already started. The selection requests are performed in a
   * regular polling fashion.
   * @param model The task's TF.js model
   * @param epoch The task's epoch
   * @param trainingInformant The task's training informant
   * @throws Throws an error if the regular polling failed to obtain a successful
   * response after a few tries.
   */
  async onEpochBeginCommunication (model, epoch, trainingInformant) {
    await super.onEpochBeginCommunication(model, epoch, trainingInformant)
    /**
     * Ensure this is the first epoch of a round.
     */
    const roundDuration = this.task.trainingInformation.roundDuration
    const startOfRound = (epoch + 1) % roundDuration === 1
    if (!startOfRound) {
      return
    }
    /**
     * Wait for the selection status from server.
     */
    console.log('Awaiting for selection from server...')
    let selectionStatus = await getSuccessfulResponse(
      api.selectionStatus,
      'selected',
      MAX_TRIES,
      TIME_PER_TRIES,
      this.task.taskID,
      this.clientID
    ) as SelectionStatus
    /**
     * This happens if either the client is disconnected from the server,
     * or it failed to get a success response from server after a few tries.
     */
    if (!(selectionStatus && selectionStatus.selected > 0)) {
      throw Error('Stopped training')
    }
    if (selectionStatus.selected === 1) {
      /**
       * The client is late, the round already started. Move to aggregation phase
       * to get the latest model.
       */
      console.log(
        'Round already started. Now awaiting for aggregated model from server...'
      )
      const aggregationStatus = await getSuccessfulResponse(
        api.aggregationStatus,
        'aggregated',
        MAX_TRIES,
        TIME_PER_TRIES,
        this.task.taskID,
        this.round,
        this.clientID
      ) as AggregationStatus
      /**
       * This happens if either the client is disconnected from the server,
       * or it failed to get a success response from server after a few tries.
       */
      if (!(aggregationStatus && aggregationStatus.aggregated)) {
        throw Error('Stopped training')
      }
      /**
       * Update local weights with the most recent model stored on server.
       */
      model = this.task.createModel()
      console.log('Updated local model')
      /**
       * The client can resume selection phase.
       */
      console.log('Awaiting for selection from server...')
      selectionStatus = await getSuccessfulResponse(
        api.selectionStatus,
        'selected',
        MAX_TRIES,
        TIME_PER_TRIES,
        this.task.taskID,
        this.clientID
      ) as SelectionStatus
    }
    if (!(selectionStatus && selectionStatus.selected === 2)) {
      throw Error('Stopped training')
    }
    /**
     * Proceed to training phase.
     */
    this.selected = true
    this.round = selectionStatus.round
  }

  /**
   * On the end of each round of the task's training loop, perform the required
   * communication routine with the centralized server. Checks whether the requested
   * round has completed, i.e. the server aggregated weights for this round. This is
   * done by regularly polling the server for aggregation status via its API. The
   * aggregation requests are performed in a regular polling fashion.
   * @param model The task's TF.js model
   * @param epoch The task's epoch
   * @param trainingInformant The task's training informant
   * @throws Throws an error if the regular polling failed to obtain a successful
   * response after a few tries.
   */
  async onEpochEndCommunication (model, epoch, trainingInformant) {
    await super.onEpochEndCommunication(model, epoch, trainingInformant)
    /**
     * Ensure this was the last epoch of a round.
     */
    const roundDuration = this.task.trainingInformation.roundDuration
    const endOfRound = epoch > 1 && (epoch + 1) % roundDuration === 1
    if (!endOfRound) {
      return
    }
    /**
     * Once the training round is completed, send local weights to the
     * server for aggregation.
     */
    await this.postWeights(model.weights)
    /**
     * Wait for the server to proceed to weights aggregation.
     */
    console.log('Awaiting for aggregated model from server...')
    const aggregationStatus = (await getSuccessfulResponse(
      api.aggregationStatus,
      'aggregated',
      MAX_TRIES,
      TIME_PER_TRIES,
      this.task.taskID,
      this.round,
      this.clientID
    )) as AggregationStatus
    /**
     * This happens if either the client is disconnected from the server,
     * or it failed to get a success response from server after a few tries.
     */
    if (!(aggregationStatus && aggregationStatus.aggregated)) {
      throw Error('Stopped training')
    }
    /**
     * Update local weights with the most recent model stored on server.
     */
    this.selected = false
    model = this.task.createModel()
    console.log('Updated local model')
  }
}
