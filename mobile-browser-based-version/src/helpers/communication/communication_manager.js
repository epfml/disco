import { makeID } from './helpers.js';
// TODO: use import from syntax
const Peer = require('peerjs');
import { PeerJS, handleData } from './peer.js';
/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class CommunicationManager {
  /**
   * Prepares connection to a PeerJS server.
   * @param {Number} portNbr the port number to connect.
   */
  constructor(serverURL, taskID, taskPassword = null) {
    this.serverURL = serverURL;
    this.taskID = taskID;
    this.peerjsID = null;
    this.peer = null;
    this.peerjs = null;
    this.receivers = [];
    this.isConnected = null;
    this.recvBuffer = null;
    this.taskPassword = taskPassword;
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
  async connect(epochs, environment) {
    // initialize the buffer
    this.recvBuffer = {
      trainInfo: {
        epochs: epochs,
      },
    };

    // create an ID used to connect to the server
    this.peerjsID = await makeID(10);
    // connect to the PeerJS server
    // this.peer = new Peer(this.peerjsId, {
    //   host: 'localhost',
    //   port: 8080,
    //   path: `/deai/${this.taskID}`,
    // });

    this.peer = new Peer(this.peerjsID, {
      host: this.serverURL,
      path: `${this.serverURL}/${this.taskID}`,
      secure: true,
      config: {
        iceServers: [
          { url: 'stun:stun.l.google.com:19302' },
          {
            url: 'turn:34.77.172.69:3478',
            credential: environment.$t('name'),
            username: environment.$t('name'),
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
        this.peerjs = await new PeerJS(
          this.peer,
          this.password,
          handleData,
          this.recvBuffer
        );
        resolve(this.isConnected);
      });
    });
  }

  /**
   * Updates the receivers' list.
   */
  async updateReceivers() {
    let peerIDs = await fetch(
      `${this.serverURL}/${this.taskID}/peerjs/peers`
    ).then((response) => response.json());

    this.receivers = peerIDs.filter((value) => value != this.peerjsID);
  }
}
