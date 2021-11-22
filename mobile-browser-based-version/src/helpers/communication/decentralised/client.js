import msgpack from 'msgpack-lite';
import Peer from 'peerjs';
import Hashes from 'jshashes';
import {
  makeID,
  serializeWeights,
  averageWeightsIntoModel,
  authenticate,
} from '../helpers';
import { Client } from '../client';
import CMD_CODES from './communication_codes';

/**
 * NOTE: peer.js seems to convert all array types to ArrayBuffer, making the original
 * type unrecoverable (Float32Array, Uint8Array, ...). The solution is to encode any payload
 * with msgpack.encode, then decode at the destination.
 */

/**
 * The waiting time between performing requests to the centralized server.
 * Expressed in milliseconds.
 */
const TIME_PER_TRIES = 100;
/**
 * The maximum number of tries before stopping to perform requests.
 */
const MAX_TRIES = 100;

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class DecentralisedClient extends Client {
  /**
   * Constructs the client for decentralised training.
   * @param {String} serverURL
   * @param {String} taskID
   * @param {String} taskPassword
   * @param {Function} dataHandlerFunction
   * @param  {...any} dataHandlerArgs
   */
  constructor(
    serverURL,
    task,
    password = null,
    dataHandlerFunction,
    ...dataHandlerArgs
  ) {
    super(serverURL, task);
    this.password = password;
    this.handleData = dataHandlerFunction;
    this.handleDataArgs = dataHandlerArgs;

    this.receivers = [];
    this.isConnected = false;
    this.recvBuffer = null;
    this.peer = null;
  }

  /**
   * Initialize the connection to the PeerJS server.
   * @param {Number} epochs the number of epochs.
   */
  async connect(epochs) {
    console.log('Connecting...');
    this.recvBuffer = {
      trainInfo: {
        epochs: epochs,
      },
    };

    /**
     * Uncomment the code below to test the app with a local server.
     */
    this.peer = new Peer(makeID(10), {
      host: 'localhost',
      port: 8080,
      path: `/deai/${this.task.taskID}`,
    });

    /*
    this.peer = new Peer(makeID(10), {
      host: this.serverURL,
      path: `/this.task.taskID`,
      secure: true,
      config: {
        iceServers: [
          { url: 'stun:stun.l.google.com:19302' },
          {
            url: 'turn:34.77.172.69:3478',
            credential: 'deai',
            username: 'deai',
          },
        ],
      },
    });
    */

    return new Promise((resolve, reject) => {
      this.peer.on('error', (error) => {
        this.isConnected = false;
        console.log('Failed to connect to the centralized server.');
        console.log(error);
        reject(this.isConnected);
      });

      this.peer.on('open', async (id) => {
        console.log('Connected');
        this.isConnected = true;
        this.peer.on('connection', (conn) => {
          console.log(`New connection from ${conn.peer}`);
          conn.on('data', async (data) => {
            this.data = data;
            await this.handleData(
              data,
              conn.peer,
              this.password,
              ...this.handleDataArgs
            );
          });
        });
        resolve(this.isConnected);
      });
    });
  }

  /**
   * Disconnection process when user quits the task.
   */
  disconnect() {
    if (this.peer != null) {
      this.peer.disconnect();
      this.peer.destroy();
    }
  }

  /**
   * Request weights from peers, carry on if the number of received weights is
   * greater than the provided threshold
   */
  async onEpochEndCommunication(model, epoch, trainingInformant) {
    super.onEpochEndCommunication(model, epoch, trainingInformant);
    this.updateReceivers();
    const serializedWeights = await serializeWeights(model.weights);
    const epochWeights = { epoch: epoch, weights: serializedWeights };

    const threshold = this.task.trainingInformation.threshold ?? 1;

    console.log('Receivers are: ' + this.receivers);
    /**
     * Iterate over all other peers connected to the same task and send them a
     * weights request.
     */
    for (const receiver of this.receivers) {
      await this.sendData(
        { name: this.peer.id },
        CMD_CODES.WEIGHT_REQUEST,
        receiver
      );
      trainingInformant.addMessage(`Sending weight request to: ${receiver}`);

      if (
        this.recvBuffer.weightRequests !== undefined &&
        this.recvBuffer.weightRequests.has(receiver)
      ) {
        console.log('Sending weights to: ', receiver);
        trainingInformant.addMessage(`Sending weights to: ${receiver}`);
        trainingInformant.updateWhoReceivedMyModel(receiver);
        await this.sendData(epochWeights, CMD_CODES.AVG_WEIGHTS, receiver);
      }
    }
    if (this.recvBuffer.weightRequests !== undefined) {
      trainingInformant.updateNbrWeightsRequests(
        this.recvBuffer.weightRequests.size
      );
      this.recvBuffer.weightRequests.clear();
    }

    // wait to receive weights only if other peers are connected (i.e I have receivers for now, might need to be updates)
    // For now, no distinction between receivers and being connected to the server
    if (this.receivers.length > 0) {
      // Wait to receive weights
      if (this.recvBuffer.avgWeights === undefined) {
        console.log('Waiting to receive weights...');
        trainingInformant.addMessage('Waiting to receive weights...');
        const startTime = new Date();
        await this.dataReceivedBreak(this.recvBuffer, 'avgWeights', 100);
        const endTime = new Date();
        const timeDiff = (endTime - startTime) / 1000;
        trainingInformant.updateWaitingTime(Math.round(timeDiff));
        // Timeout to avoid deadlock (10s) TODO: where is the timeout?
      }

      if (this.recvBuffer.avgWeights !== undefined) {
        // Check if any weights were received
        console.log('Waiting to receive enough weights...');
        await this.checkArrayLen(this.recvBuffer, threshold, true, epoch).then(
          () => {
            console.log('Averaging weights');
            trainingInformant.updateNbrUpdatesWithOthers(1);
            trainingInformant.addMessage('Averaging weights');

            averageWeightsIntoModel(
              Object.values(this.recvBuffer.avgWeights).flat(1),
              model
            );

            delete this.recvBuffer.avgWeights; // NOTE: this might delete useful weights...
          }
        );
      }
    } else {
      trainingInformant.addMessage(
        'No one is connected. Move to next epoch without waiting.'
      );
    }

    // Change data handler for future requests if this is the last epoch
    if (epoch == this.recvBuffer.trainInfo.epochs) {
      // Modify the end buffer (same buffer, but with one additional components: lastWeights)
      this.recvBuffer.peer = this;
      this.recvBuffer.lastUpdate = epochWeights;
      this.setDataHandler(this.handleDataEnd, this.recvBuffer);
    }
    /*
    if (epoch == recvBuffer.trainInfo.epochs) { // Modify the end buffer (same buffer, but with one additional components: lastWeights)
        var endBuffer = epochWeights
        endBuffer.peerjs = peerjs
        peerjs.setDataHandler(handleDataEnd, endBuffer)
    }*/
  }

  /**
   * Updates the receivers' list.
   */
  async updateReceivers() {
    let peerIDs = await fetch(
      this.serverURL.concat(`${this.task.taskID}/peerjs/peers`)
    ).then((response) => response.json());

    this.receivers = peerIDs.filter((value) => value != this.peer.id);
  }

  /**
   * Change data handling function
   */
  setDataHandler(func, ...args) {
    this.handleData = func;
    this.handleDataArgs = args;
  }

  /**
   * Send data to a remote peer registered on the PeerJS server
   * @param {Object} data Data to send.
   * @param {Number} code Communication code.
   * @param {String} receiver Name of the receiver peer.
   */
  async sendData(data, code, receiver) {
    const message = {
      cmdCode: code,
      payload: msgpack.encode(data),
    };
    if (this.password) {
      var SHA256 = new Hashes.SHA256();
      console.log(`Current peer: ${this.peer.id}`);
      data.password_hash = SHA256.hex(this.peer.id + ' ' + this.password);
    }
    const conn = this.peer.connect(receiver);
    conn.on('open', () => {
      conn.send(message);
    });
  }

  /**
   * Function given to PeerJS instance to handle incoming data
   * @param {object} data incoming data
   * @param {object} buffer buffer to store data
   */
  async handleData(data, senderID, password, buffer) {
    console.log(`Received new data: ${data}`);

    if (!authenticate(data.password_hash, senderID, password)) {
      return;
    }

    // Convert the peerjs ArrayBuffer back into Uint8Array
    let payload = msgpack.decode(Uint8Array.from(data.payload));
    let epoch = payload.epoch;
    let weights = payload.weights;
    let receiver = payload.name;

    switch (data.cmdCode) {
      case CMD_CODES.MODEL_INFO:
        buffer.model = payload;
        break;
      case CMD_CODES.ASSIGN_WEIGHTS:
        buffer.assignWeights = payload;
        break;
      case CMD_CODES.COMPILE_MODEL:
        buffer.compileData = payload;
        break;
      case CMD_CODES.AVG_WEIGHTS:
        console.log(payload);
        if (buffer.avgWeights === undefined) {
          buffer.avgWeights = {};
        }
        if (buffer.avgWeights[epoch] === undefined) {
          buffer.avgWeights[epoch] = [weights];
        } else {
          buffer.avgWeights[epoch].push(weights);
        }
        console.log(`'#Weights: ${buffer.avgWeights[epoch].length}`);
        break;
      case CMD_CODES.TRAIN_INFO:
        buffer.trainInfo = payload;
        break;
      case CMD_CODES.WEIGHT_REQUEST:
        if (buffer.weightRequests === undefined) {
          buffer.weightRequests = new Set([]);
        }
        buffer.weightRequests.add(receiver);
        console.log(`Weight request from: ${receiver}`);

        break;
    }
  }

  /**
   * Wait to receive data by checking if recvBuffer.key is defined
   * @param {Object} recvBuffer
   * @param {*} key
   */
  dataReceived(recvBuffer, key) {
    return new Promise((resolve) => {
      (function waitData() {
        if (recvBuffer[key]) {
          console.log(recvBuffer);
          return resolve();
        }
        setTimeout(waitData, TIME_PER_TRIES);
      })();
    });
  }

  /**
   * Same as dataReceived, but break after maxTries
   * @param {Object} recvBuffer
   * @param {*} key
   */
  dataReceivedBreak(recvBuffer, key) {
    return new Promise((resolve) => {
      (function waitData(n) {
        if (recvBuffer[key] || n >= MAX_TRIES - 1) {
          return resolve();
        }
        setTimeout(() => waitData(n + 1), TIME_PER_TRIES);
      })(0);
    });
  }

  /**
   * Waits until an array reaches a given length. Used to make
   * sure that all weights from peers are received.
   * @param {Array} recvBuffer where you will get the avgWeights from
   * @param {int} len
   * @param {Boolean} isCommon true if this function is called on epoch common
   * @param {int} epoch epoch when this function is called
   */
  checkArrayLen(recvBuffer, len, isCommon, epoch) {
    return new Promise((resolve) => {
      (function waitData(n) {
        let arr = [];
        if (isCommon) {
          arr = Object.values(recvBuffer.avgWeights).flat(1);
        } else {
          arr = recvBuffer.avgWeights[epoch];
        }

        if (arr.length >= len || MAX_TRIES <= n) {
          return resolve();
        }
        setTimeout(() => waitData(n + 1), TIME_PER_TRIES);
      })(0);
    });
  }

  /**
   * Handle data exchange after training is finished
   */
  async handleDataEnd(data, senderID, password, buffer) {
    console.log(`Received new data: ${data}`);

    if (!authenticate(data.password_hash, senderID, password)) {
      return;
    }

    // convert the peerjs ArrayBuffer back into Uint8Array
    let payload = msgpack.decode(new Uint8Array(data.payload));
    let receiver = payload.name;
    let epochWeights = {
      epoch: buffer.lastUpdate.epoch,
      weights: buffer.lastUpdate.weights,
    };
    switch (data.cmdCode) {
      case CMD_CODES.WEIGHT_REQUEST:
        console.log(`Sending weights to: ${receiver}`);
        await this.sendData(
          epochWeights,
          CMD_CODES.AVG_WEIGHTS,
          buffer.peerjs,
          receiver
        );
        break;
    }
  }
}
