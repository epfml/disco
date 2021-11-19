import path from 'path';
import msgpack from 'msgpack-lite';
import Peer from 'peerjs';
import Hashes from 'jshashes';
import {
  makeID,
  serializeWeights,
  dataReceivedBreak,
  checkArrayLen,
  handleDataEnd,
  averageWeightsIntoModel,
  authenticate,
} from '../helpers';
import Client from '../client';
import CMD_CODES from './communication_codes';

/**
 * NOTE: peer.js seems to convert all array types to ArrayBuffer, making the original
 * type unrecoverable (Float32Array, Uint8Array, ...). The solution is to encode any payload
 * with msgpack.encode, then decode at the destination.
 */

/**
 * ...
 */
const TIME_PER_TRIES = 100;
/**
 * ...
 */
const MAX_TRIES = 100;

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class DecentralizedClient extends Client {
  /**
   * Prepares connection to a PeerJS server.
   */
  constructor(
    serverURL,
    taskID,
    taskPassword = null,
    handleData,
    ...handleDataArgs
  ) {
    super(serverURL, taskID);
    this.taskPassword = taskPassword;
    this.handleData = handleData;
    this.handleDataArgs = handleDataArgs;

    this.receivers = [];
    this.isConnected = false;
    this.recvBuffer = null;
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
   * Initialize the connection to the server.
   * @param {Number} epochs the number of epochs (required to initialize the communication buffer).
   */
  async connect(epochs) {
    this.recvBuffer = {
      trainInfo: {
        epochs: epochs,
      },
    };

    this.peer = new Peer(makeID(10), {
      host: this.serverURL,
      path: this.serverURL.concat(this.taskID),
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
    return new Promise((resolve, reject) => {
      this.peer.on('error', (error) => {
        this.isConnected = false;
        reject(this.isConnected);
      });

      this.peer.on('open', async (id) => {
        this.isConnected = true;
        this.peer.on('connection', (conn) => {
          console.log(`New connection from ${conn.peer}`);
          conn.on('data', async (data) => {
            this.data = data;
            await this.handleData(
              data,
              conn.peer,
              this.taskPassword,
              ...this.handleDataArgs
            );
          });
        });
        resolve(this.isConnected);
      });
    });
  }

  /**
   * Updates the receivers' list.
   */
  async updateReceivers() {
    let peerIDs = await fetch(
      this.serverURL.concat(path.join(this.taskID, 'peerjs', 'peer'))
    ).then((response) => response.json());

    this.receivers = peerIDs.filter((value) => value != this.peerjsID);
  }

  /**
   * Send data to remote peer
   * @param {Peer} receiver PeerJS remote peer (Peer object).
   * @param {object} data object to send
   */
  async send(receiver, data) {
    const conn = this.localPeer.connect(receiver);
    conn.on('open', () => {
      conn.send(data);
    });
  }

  /**
   * Change data handling function
   */
  setDataHandler(func, ...args) {
    this.handleData = func;
    this.handleDataArgs = args;
  }

  /**
   * Request weights from peers, carry on if the number of received weights is
   * greater than the provided threshold
   */
  async onEpochEndCommunication(model, epoch, trainingInformant) {
    this.updateReceivers();
    const serializedWeights = await serializeWeights(model);
    var epochWeights = { epoch: epoch, weights: serializedWeights };

    let threshold = this.task.trainingInformation.threshold ?? 1;

    console.log('Receivers are: ' + this.receivers);
    // request weights and send to all who requested
    for (var i in this.receivers) {
      // Sending  weight request
      await this.sendData(
        { name: this.peer.id },
        CMD_CODES.WEIGHT_REQUEST,
        this.receivers[i]
      );
      trainingInformant.addMessage(
        'Sending weight request to: ' + this.receivers[i]
      );

      if (
        this.recvBuffer.weightRequests !== undefined &&
        this.recvBuffer.weightRequests.has(this.receivers[i])
      ) {
        console.log('Sending weights to: ', this.receivers[i]);
        trainingInformant.addMessage(
          'Sending weights to: ' + this.receivers[i]
        );
        trainingInformant.updateWhoReceivedMyModel(this.receivers[i]);
        await this.sendData(
          epochWeights,
          CMD_CODES.AVG_WEIGHTS,
          this.receivers[i]
        );
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
    if (this.receivers.length !== 0) {
      // wait to receive weights
      if (this.recvBuffer.avgWeights === undefined) {
        var startTime = new Date();

        console.log('Waiting to receive weights...');
        trainingInformant.addMessage('Waiting to receive weights...');
        await dataReceivedBreak(this.recvBuffer, 'avgWeights', 100).then(
          (value) => {
            var endTime = new Date();
            var timeDiff = endTime - startTime; //in ms
            timeDiff /= 1000;
            trainingInformant.updateWaitingTime(Math.round(timeDiff));
          }
        ); // timeout to avoid deadlock (10s)

        // update the waiting time
      }

      if (this.recvBuffer.avgWeights !== undefined) {
        // check if any weights were received
        console.log('Waiting to receive enough weights...');
        await checkArrayLen(this.recvBuffer, threshold, true, epoch).then(
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

    // change data handler for future requests if this is the last epoch
    if (epoch == this.recvBuffer.trainInfo.epochs) {
      // Modify the end buffer (same buffer, but with one additional components: lastWeights)
      this.recvBuffer.peer = this;
      this.recvBuffer.lastUpdate = epochWeights;
      this.setDataHandler(handleDataEnd, this.recvBuffer);
    }
    /*
    if (epoch == recvBuffer.trainInfo.epochs) { // Modify the end buffer (same buffer, but with one additional components: lastWeights)
        var endBuffer = epochWeights
        endBuffer.peerjs = peerjs
        peerjs.setDataHandler(handleDataEnd, endBuffer)
    }*/
  }

  /**
   * Send a serialized TFJS model to a remote peer
   * @param {TFJS model} model the model to send
   * @param {PeerJS} peerjs instance of PeerJS object
   * @param {String} receiver receiver name (must be registered in PeerJS server)
   * @param {String} name name to save the model with, can be anything
   */
  async sendModel(model, receiver) {
    var serialized = await serializeWeights(model);
    let request = {
      cmdCode: CMD_CODES.MODEL_INFO,
      payload: msgpack.encode(serialized),
    };
    this.send(receiver, request);
  }

  /**
   * Send data to a remote peer
   * @param {object} data data to send
   * @param {int} code code in CMD_CODES to identify what the data is for
   * @param {PeerJS} peerjs PeerJS object
   * @param {String} receiver name of receiver peer (must be registered in PeerJS server)
   */
  async sendData(data, code, peerjs, receiver) {
    const message = {
      cmdCode: code,
      payload: msgpack.encode(data),
    };
    if (peerjs.password) {
      var SHA256 = new Hashes.SHA256();
      console.log(`Current peer: ${this.peer.id}`);
      data.password_hash = SHA256.hex(this.peer.id + ' ' + this.password);
    }

    this.send(receiver, message);
  }

  /**
   * Function given to PeerJS instance to handle incoming data
   * @param {object} data incoming data
   * @param {object} buffer buffer to store data
   */
  async handleData(data, senderId, password, buffer) {
    console.log(`Received new data: ${data}`);

    if (!authenticate(data.password_hash, senderId, password)) {
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
  async handleDataEnd(data, senderId, password, buffer) {
    console.log(`Received new data: ${data}`);

    if (!authenticate(data.password_hash, senderId, password)) {
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
