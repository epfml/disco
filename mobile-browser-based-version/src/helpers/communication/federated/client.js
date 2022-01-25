import * as msgpack from 'msgpack-lite';
import { makeID, serializeWeights } from '../helpers';
import { getSuccessfulResponse } from './helpers';
import { Client } from '../client';
import * as api from './api';

/**
 * The waiting time between performing requests to the centralized server.
 * Expressed in milliseconds.
 */
const TIME_PER_TRIES = 1000;
/**
 * The maximum number of tries before stopping to perform requests.
 */
const MAX_TRIES = 30;

/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class FederatedClient extends Client {
  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {Task} task The associated task object.
   * @param {Number} round The training round.
   */
  constructor(serverURL, task) {
    super(serverURL, task);
    this.clientID = null;
    this.round = 0;
    this.selected = false;
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  async connect() {
    /**
     * Create an ID used to connect to the server.
     * The client is now considered as connected and further
     * API requests may be made.
     */
    this.clientID = makeID(10);
    const response = await api.connect(this.task.taskID, this.clientID);
    return response.ok;
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect() {
    const response = await api.disconnect(this.task.taskID, this.clientID);
    return response.ok;
  }

  async selectionStatus() {
    const response = await api.selectionStatus(this.task.taskID, this.clientID);
    return response.ok ? await response.json() : undefined;
  }

  /**
   * Requests the aggregated weights from the centralized server,
   * for the given epoch
   * @returns The aggregated weights for the given epoch.
   */
  async aggregationStatus() {
    const response = await api.aggregationStatus(
      this.task.taskID,
      this.round,
      this.clientID
    );
    return response.ok ? await response.json() : undefined;
  }

  async postWeights(weights) {
    const encodedWeights = msgpack.encode(
      Array.from(await serializeWeights(weights))
    );
    const response = await api.postWeights(
      this.task.taskID,
      this.round,
      this.clientID,
      encodedWeights
    );
    return response.ok;
  }

  async postMetadata(metadataID, metadata) {
    const response = api.postMetadata(
      this.task.taskID,
      this.round,
      this.clientID,
      metadataID,
      metadata
    );
    return response.ok;
  }

  async getMetadataMap(metadataID) {
    const response = await api.getMetadataMap(
      this.task.taskID,
      this.round,
      this.clientID,
      metadataID
    );
    if (response.ok) {
      const body = await response.json();
      return new Map(msgpack.decode(body[metadataID]));
    } else {
      return new Map();
    }
  }

  async onEpochBeginCommunication(model, epoch, trainingInformant) {
    await super.onEpochBeginCommunication(model, epoch, trainingInformant);
    /**
     * Ensure this is the first epoch of a round.
     */
    const roundDuration = this.task.trainingInformation.roundDuration;
    const startOfRound = (epoch + 1) % roundDuration === 1;
    if (!startOfRound) {
      return;
    }
    /**
     * Wait for the selection status from server.
     */
    console.log('Awaiting for selection from server...');
    var selectionStatus = await getSuccessfulResponse(
      api.selectionStatus,
      'selected',
      MAX_TRIES,
      TIME_PER_TRIES,
      this.task.taskID,
      this.clientID
    );
    /**
     * This happens if either the client is disconnected from the server,
     * or it failed to get a success response from server after a few tries.
     */
    if (!(selectionStatus && selectionStatus.selected > 0)) {
      throw Error('Stopped training');
    }
    if (selectionStatus.selected === 1) {
      /**
       * The client is late, the round already started. Move to aggregation phase
       * to get the latest model.
       */
      console.log(
        'Round already started. Now awaiting for aggregated model from server...'
      );
      const aggregationStatus = await getSuccessfulResponse(
        api.aggregationStatus,
        'aggregated',
        MAX_TRIES,
        TIME_PER_TRIES,
        this.task.taskID,
        this.round,
        this.clientID
      );
      /**
       * This happens if either the client is disconnected from the server,
       * or it failed to get a success response from server after a few tries.
       */
      if (!(aggregationStatus && aggregationStatus.aggregated)) {
        throw Error('Stopped training');
      }
      /**
       * Update local weights with the most recent model stored on server.
       */
      model = this.task.createModel();
      console.log('Updated local model');
      /**
       * The client can resume selection phase.
       */
      console.log('Awaiting for selection from server...');
      selectionStatus = await getSuccessfulResponse(
        api.selectionStatus,
        'selected',
        MAX_TRIES,
        TIME_PER_TRIES,
        this.task.taskID,
        this.clientID
      );
    }
    if (!(selectionStatus && selectionStatus.selected === 2)) {
      throw Error('Stopped training');
    }
    /**
     * Proceed to training phase.
     */
    this.selected = true;
    this.round = selectionStatus.round;
  }

  async onEpochEndCommunication(model, epoch, trainingInformant) {
    await super.onEpochEndCommunication(model, epoch, trainingInformant);
    /**
     * Ensure this was the last epoch of a round.
     */
    const roundDuration = this.task.trainingInformation.roundDuration;
    const endOfRound = epoch > 1 && (epoch + 1) % roundDuration === 1;
    if (!endOfRound) {
      return;
    }
    /**
     * Once the training round is completed, send local weights to the
     * server for aggregation.
     */
    await this.postWeights(model.weights);
    /**
     * Wait for the server to proceed to weights aggregation.
     */
    console.log('Awaiting for aggregated model from server...');
    const aggregationStatus = await getSuccessfulResponse(
      api.aggregationStatus,
      'aggregated',
      MAX_TRIES,
      TIME_PER_TRIES,
      this.task.taskID,
      this.round,
      this.clientID
    );
    /**
     * This happens if either the client is disconnected from the server,
     * or it failed to get a success response from server after a few tries.
     */
    if (!(aggregationStatus && aggregationStatus.aggregated)) {
      throw Error('Stopped training');
    }
    /**
     * Update local weights with the most recent model stored on server.
     */
    this.selected = false;
    model = this.task.createModel();
    console.log('Updated local model');
  }
}
