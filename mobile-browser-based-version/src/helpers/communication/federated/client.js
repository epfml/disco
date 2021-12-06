import * as msgpack from 'msgpack-lite';
import { makeID, serializeWeights, assignWeightsToModel } from '../helpers';
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
const MAX_TRIES = 10;

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
    if (response.ok) {
      return await response.json();
    } else {
      return false;
    }
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
    if (response.ok) {
      return await response.json();
    } else {
      return false;
    }
  }

  async postWeights(weights) {
    const encodedWeights = msgpack.encode(
      Array.from(serializeWeights(weights))
    );
    const response = await api.postWeights(
      this.task.taskID,
      this.round,
      this.clientID,
      encodedWeights
    );
    return response.ok;
  }

  async postSamples(samples) {
    const response = api.postSamples(
      this.task.taskID,
      this.round,
      this.clientID,
      samples
    );
    return response.ok;
  }

  async getSamplesMap() {
    const response = await api.getSamplesMap(
      this.task.taskID,
      this.round,
      this.clientID
    );
    if (response.ok) {
      const body = await response.json();
      return new Map(msgpack.decode(body.samples));
    } else {
      return new Map();
    }
  }

  async onEpochEndCommunication(model, epoch, trainingInformant) {
    super.onEpochEndCommunication(model, epoch, trainingInformant);
    /**
     * Send the epoch's local weights to the server.
     */
    trainingInformant.addMessage('Sending weights to server');
    await this.postWeights(model.weights);
    /**
     * Request the epoch's aggregated weights from the server.
     * If successful, update the local weights with the aggregated
     * weights.
     */
    trainingInformant.addMessage(
      'Waiting to receive aggregated weights from server.'
    );
    var startTime = new Date();
    await this.aggregationStatus().then((receivedWeights) => {
      var endTime = new Date();
      var timeDiff = endTime - startTime; // in ms
      timeDiff /= 1000;
      trainingInformant.updateWaitingTime(Math.round(timeDiff));
      trainingInformant.updateNbrUpdatesWithOthers(1);
      trainingInformant.addMessage(
        'Received aggregated weights from server. Updating local weights.'
      );

      if (receivedWeights.length > 0) {
        assignWeightsToModel(model, receivedWeights);
      }
    });
    /**
     * Request the epoch's data shares from the server.
     */
    trainingInformant.addMessage(
      'Waiting to receive metadata & statistics from server.'
    );
    await this.getSamplesMap().then((dataShares) => {
      if (dataShares.length > 0) {
        trainingInformant.updateDataShares(dataShares);
      }
    });
  }
}
