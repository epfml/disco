import * as msgpack from 'msgpack-lite';
import { makeID, serializeWeights, assignWeightsToModel } from '../helpers';
import { getSuccessfulResponse } from './heplers';
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

  async onEpochStartCommunication(model, epoch, trainingInformant) {
    super.onEpochStartCommunication(model, epoch, trainingInformant);

    const startOfNextRound =
      this.task.trainingInformation.epochs * (this.round + 1) + 1;
    if (epoch + 1 < startOfNextRound) {
      return;
    }
    /**
     * Wait for the server to select this client.
     */
    const success = await getSuccessfulResponse(
      api.selectionStatus,
      'selected',
      MAX_TRIES,
      TIME_PER_TRIES,
      this.task.taskID,
      this.clientID
    );
    /**
     * This should not happen if the waiting process above is done right.
     * One should definitely define a behavior to make the app robust.
     */
    if (!(success && success.selected)) {
      throw Error('Not implemented');
    }
    /**
     * Proceed to the training round.
     */
    this.selected = true;
    this.round = success.round;
  }

  async onEpochEndCommunication(model, epoch, trainingInformant) {
    super.onEpochEndCommunication(model, epoch, trainingInformant);

    const endOfCurrentRound =
      this.task.trainingInformation.epochs * (this.round + 1);
    if (epoch + 1 < endOfCurrentRound) {
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
    const success = await getSuccessfulResponse(
      api.aggregationStatus,
      'aggregated',
      MAX_TRIES,
      TIME_PER_TRIES,
      this.task.taskID,
      this.round,
      this.clientID
    );
    /**
     * This should not happen if the waiting process above is done right.
     * Continue with local weights without performing any update step.
     */
    if (!(success && success.aggregated)) {
      return;
    }
    /**
     * Update local weights with the most recent model stored on server.
     */
    this.selected = false;
    model = this.task.createModel();
  }
}
