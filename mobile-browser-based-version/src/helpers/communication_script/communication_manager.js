import Peer from "peerjs";
import {
    SERVER_API,
    serverManager
} from './server_manager';
import {
    PeerJS,
    handleData,
} from "./peer";

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class CommunicationManager {
    /**
     * Prepares connection to a PeerJS server.
     */
    constructor() {
        this.peer = null;
        this.peerjs = null;
        this.receivers = [];
        this.isConnected = null;
        this.recvBuffer = null;
    }

    /**
     * Disconnection process when user quits the task.
     */
    disconect() {
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

        // Connect to the PeerServer
        this.peer = new Peer({
            host: serverManager.host,
            port: serverManager.port,
            path: SERVER_API.PEER_SERVER.PATH,
            key: SERVER_API.PEER_SERVER.KEY
        });

        let googleServerConfig = {
            host: '35.242.193.186', port: 9000, path: '/deai',
            config: {
                'iceServers': [
                    { url: 'stun:stun.l.google.com:19302' },
                    { url: 'turn:35.242.193.186:3478', credential: 'deai', username: 'deai' }
                ]
            }
        }

        this.peer.on("error", (err) => {
            console.log("Error in connecting");
            this.isConnected = false;


            environment.$toast.error(
                "Failed to connect to server. Fallback to training alone."
            );
            setTimeout(environment.$toast.clear, 30000);
        });

        this.peer.on("open", async (id) => {

            this.isConnected = true;

            this.peerjs = await new PeerJS(this.peer, handleData, this.recvBuffer);

            environment.$toast.success(
                "Succesfully connected to server. Distributed training available."
            );
            setTimeout(environment.$toast.clear, 30000);
        });
    }

    /**
     * Updates the receivers' list.
     */
    async updateReceivers() {
        let ids = await serverManager.getPeersList().then((response) => response.json());
        console.log(ids)
        let id = this.peer.id;
        this.receivers = ids.filter((value) => value != id);
    }
}
