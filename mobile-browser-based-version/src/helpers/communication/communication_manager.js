import * as msgpack from 'msgpack-lite';
import { makeID, serializeWeights, assignWeightsToModel } from './helpers';

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
 * Headers for POST requests made to the centralized server.
 */
const HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * Class that deals with communication with the centralized server when training
 * a specific task.
 */
export class CommunicationManager {
  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} ID The ID of the task.
   * @param {String} serverURL The URL of the centralized server.
   * @param {String} taskPassword The password of the task.
   */
  constructor(serverURL, taskID, taskPassword = null) {
    this.serverURL = serverURL;
    this.taskID = taskID;
    this.clientID = null;
    this.taskPassword = taskPassword;
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
    this.clientID = await makeID(10);
    const requestURL = this.serverURL.concat(
      `connect/${this.taskID}/${this.clientID}`
    );
    const requestOptions = { method: 'GET' };
    const response = await fetch(requestURL, requestOptions);
    return response.ok;
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect() {
    const requestURL = this.serverURL.concat(
      `disconnect/${this.taskID}/${this.clientID}`
    );
    const requestOptions = {
      method: 'GET',
      keepalive: true,
    };
    const response = await fetch(requestURL, requestOptions);
    return response.ok;
  }

  async sendIndividualWeights(weights, epoch) {
    const encodedWeights = msgpack.encode(
      Array.from(serializeWeights(weights))
    );
    const requestURL = this.serverURL.concat(
      `send_weights/${this.taskID}/${epoch}`
    );
    const requestOptions = {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        id: this.clientID,
        timestamp: new Date(),
        weights: encodedWeights,
      }),
    };
    const response = await fetch(requestURL, requestOptions);
    return response.ok;
  }

  /**
   * Requests the aggregated weights from the centralized server,
   * for the given epoch
   * @param {Number} epoch The epoch.
   * @returns The aggregated weights for the given epoch.
   */
  async receiveAggregatedWeights(epoch) {
    const requestURL = this.serverURL.concat(
      `receive_weights/${this.taskID}/${epoch}`
    );
    const requestOptions = {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        id: this.clientID,
        timestamp: new Date(),
      }),
    };
    return await tryRequest(requestURL, requestOptions, MAX_TRIES).then(
      (response) =>
        response
          .json()
          .then((body) => msgpack.decode(Uint8Array.from(body.weights.data))),
      (error) => {
        console.log(error);
        return Uint8Array.from([]);
      }
    );
  }

  async sendNbrDataSamples(nbrSamples, epoch) {
    const requestURL = this.serverURL.concat(
      `send_nbsamples/${this.taskID}/${epoch}`
    );
    const requestOptions = {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        id: this.clientID,
        timestamp: new Date(),
        samples: nbrSamples,
      }),
    };
    const response = await fetch(requestURL, requestOptions);
    return response.ok;
  }

  async receiveDataShares(epoch) {
    const requestURL = this.serverURL.concat(
      `receive_nbsamples/${this.taskID}/${epoch}`
    );
    const requestOptions = {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        id: this.clientID,
        timestamp: new Date(),
      }),
    };
    const response = await fetch(requestURL, requestOptions);
    if (response.ok) {
      const body = await response.json();
      return new Map(msgpack.decode(body.samples));
    } else {
      return new Map();
    }
  }

  async onEpochEndCommunication(model, epoch, trainingInformant) {
    /**
     * Send the epoch's local weights to the server.
     */
    trainingInformant.addMessage('Sending weights to server');
    await this.sendIndividualWeights(model.weights, epoch);
    /**
     * Request the epoch's aggregated weights from the server.
     * If successful, update the local weights with the aggregated
     * weights.
     */
    trainingInformant.addMessage(
      'Waiting to receive aggregated weights from server.'
    );
    var startTime = new Date();
    await this.receiveAggregatedWeights(epoch).then((receivedWeights) => {
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
    await this.receiveDataShares(epoch).then((dataShares) => {
      if (dataShares.length > 0) {
        trainingInformant.updateDataShares(dataShares);
      }
    });
  }
}

/**
 * Tries to fetch the resource at the given URL until successful.
 * Limited to a number of tries.
 * @param {String} requestURL The request's URL.
 * @param {Object} requestOptions The request's options.
 * @param {Number} tries The number of tries.
 * @returns The successful response.
 * @throws An error if a successful response could not be obtained
 * after the specified number of tries.
 */
function tryRequest(requestURL, requestOptions, tries) {
  return new Promise((resolve, reject) => {
    async function _tryRequest(triesLeft) {
      console.log('tries left: ', triesLeft);
      const response = await fetch(requestURL, requestOptions);
      if (response.ok) {
        return resolve(response);
      }
      if (triesLeft <= 0) {
        return reject('Failed to get response from server.');
      }
      /**
       * Wait before performing the request again.
       */
      setTimeout(() => _tryRequest(triesLeft - 1), TIME_PER_TRIES);
    }
    _tryRequest(tries);
  });
}
