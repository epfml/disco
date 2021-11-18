import * as msgpack from 'msgpack-lite';
import * as tf from '@tensorflow/tfjs';
import { makeid, serializeWeights, assignWeightsToModel } from './helpers';
import { store } from '../../store/store';

// In milliseconds
const TIME_PER_TRIES = 100;
// Corresponds to waiting 10 seconds (since each try is performed every 100ms)
const MAX_TRIES = 100;

/**
 * Class that deals with communication with the server when training a specific
 * task.
 */
export class CommunicationManager {
  /**
   * Prepares connection to a centralized server for training a given task.
   * @param {String} taskID the task ID
   * @param {String} password the task's password
   */
  constructor(taskID, password = null) {
    this.serverUrl = process.env.VUE_APP_SERVER_URI;
    this.clientId = null;
    this.taskID = taskID;
    this.password = password;
  }

  /**
   * Disconnection process when user quits the task.
   */
  disconnect() {
    const disconnectUrl = this.serverUrl.concat(
      `disconnect/${this.taskID}/${this.clientId}`
    );
    fetch(disconnectUrl, {
      method: 'GET',
      keepalive: true,
    });
  }

  /**
   * Initialize the connection to the server.
   */
  async connect() {
    // Create an ID used to connect to the server.
    this.clientId = await makeid(10);
    const connectUrl = this.serverUrl.concat(
      `connect/${this.taskID}/${this.clientId}`
    );
    const response = await fetch(connectUrl, { method: 'GET' });
    return response.ok;
  }

  receiveWeightsBreak(epoch) {
    if (this.clientId === null) {
      return;
    }
    const that = this;
    return new Promise((resolve) => {
      (async function waitData(n) {
        const receiveWeightsUrl = that.serverUrl.concat(
          `receive_weights/${that.taskID}/${epoch}`
        );
        const response = await fetch(receiveWeightsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: that.clientId,
            timestamp: new Date(),
          }),
        });
        if (response.ok) {
          const body = await response.json();
          console.log(body);
          console.log(body.weights);
          return resolve(msgpack.decode(Uint8Array.from(body.weights.data)));
        }
        if (n >= MAX_TRIES - 1) {
          console.log(
            'No weights received from server. Continuing with local weights.'
          );
          return resolve(Uint8Array.from([]));
        }
        setTimeout(() => waitData(n + 1), TIME_PER_TRIES);
      })(0);
    });
  }

  async sendWeights(weights, epoch) {
    if (this.clientId === null) {
      return;
    }
    const payload = msgpack.encode(Array.from(serializeWeights(weights)));
    const sendWeightsUrl = this.serverUrl.concat(
      `send_weights/${this.taskID}/${epoch}`
    );
    const response = await fetch(sendWeightsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: this.clientId,
        timestamp: new Date(),
        weights: payload,
      }),
    });
    return response.ok;
  }

  async onEpochEndCommunication(model, epoch, trainingInformant) {
    // Send weights to server
    trainingInformant.addMessage('Sending weights to server');
    await this.sendWeights(model.weights, epoch);
    // Receive averaged weights from server
    trainingInformant.addMessage('Waiting to receive weights from server');
    var startTime = new Date();
    await this.receiveWeightsBreak(epoch).then((receivedWeights) => {
      var endTime = new Date();
      var timeDiff = endTime - startTime; // in ms
      timeDiff /= 1000;
      trainingInformant.updateWaitingTime(Math.round(timeDiff));
      trainingInformant.updateNbrUpdatesWithOthers(1);
      trainingInformant.addMessage('Updating local weights');

      if (receivedWeights.length > 0) {
        assignWeightsToModel(model, receivedWeights);
      }
    });
  }
}
