import { makeid } from "./helpers"
import Peer from "peerjs";
import {
    PeerJS,
    handle_data,
} from "./peer";

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class CommunicationManager {
    /**
     * Prepares connection to a PeerJS server.
     * @param {Number} port_nbr the port number to connect.
     */
    constructor(port_nbr) {
        this.port_nbr = port_nbr;
        this.peerjs_id = null;
        this.peer = null;
        this.peerjs = null;
        this.receivers = [];
        this.isConnected = null;
        this.recv_buffer = null;
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
    async initialize_connection(epochs, environment) {
        // initialize the buffer
        this.recv_buffer = {
            train_info: {
                epochs: epochs,
            },
        };

        // create an ID used to connect to the server
        this.peerjs_id = await makeid(10)

        // connect to the PeerJS server
        this.peer = new Peer(this.peerjs_id, {
            host: "localhost",
            port: 3000,
            path: "/peers",
          });

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
            this.peerjs = await new PeerJS(this.peer, handle_data, this.recv_buffer);
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
        let query_ids = await fetch(
            "http://localhost:".concat(String(this.port_nbr)).concat("/peers/api/peers")
        ).then((response) => response.text());
        let all_ids = JSON.parse(query_ids);

        let id = this.peerjs_id;
        this.receivers = all_ids.filter((value) => {
            return value != id;
        });
    }
}
