import { makeid } from './helpers.js';
import Peer from 'peerjs';
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
  async initializeConnection(epochs, environment) {
    // initialize the buffer
    this.recvBuffer = {
      trainInfo: {
        epochs: epochs,
      },
    };

    // create an ID used to connect to the server
    this.peerjsID = await makeid(10);
    // connect to the PeerJS server
    // this.peer = new Peer(this.peerjsId, {
    //   host: 'localhost',
    //   port: 8080,
    //   path: `/deai/${this.taskID}`,
    // });

    this.peer = new Peer(this.peerjsID, {
      host: environment.$t('server.host'),
      path: environment.$t('server.taskPath', { taskID: this.taskID }),
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

    this.peer.on('error', (error) => {
      console.log('Error in connecting');
      this.isConnected = false;

      environment.$toast.error(
        'Failed to connect to server. Fallback to training alone.'
      );
      setTimeout(environment.$toast.clear, 30000);
    });

    this.peer.on('open', async (id) => {
      this.isConnected = true;

      this.peerjs = await new PeerJS(
        this.peer,
        this.password,
        handleData,
        this.recvBuffer
      );

      environment.$toast.success(
        'Succesfully connected to server. Distributed training available.'
      );
      setTimeout(environment.$toast.clear, 30000);
    });
  }

  /**
   * Updates the receivers' list.
   */
  async updateReceivers(environment) {
    // let queryIds = await fetch(
    //   "http://localhost:".concat(String(8080)).concat(`/deai/${this.taskID}/peerjs/peers`
    // )).then(response => response.text());
    console.log(environment.$t('server.peerjsPath', { taskID: this.taskID }));
    let queryIDs = await fetch(
      environment.$t('server.peerjsPath', { taskID: this.taskID })
    ).then((response) => response.text());

    let allIDs = JSON.parse(queryIDs);
    let id = this.peerjsID;
    this.receivers = allIDs.filter(function (value) {
      return value != id;
    });
  }
}
