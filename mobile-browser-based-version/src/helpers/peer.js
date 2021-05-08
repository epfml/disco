/* eslint-disable no-case-declarations */
//import * as tf from '@tensorflow/tfjs';
import * as msgpack from 'msgpack-lite'
//import * as Peer from 'peerjs'
var Peer = require("peerjs")
import * as tf from "@tensorflow/tfjs";
import {store_model, get_serialized_model, store_serialized_model} from "./indexedDB_script"



/**
 * This object contains codes to identify what the incoming data 
 * should be used for, e.g. to build the model, average the weights etc...
 */
// trying to reproduce an Enum

export const CMD_CODES = {
    ASSIGN_WEIGHTS  : 0, // inject weights into model (unused)
    TRAIN_INFO      : 1, // n. epochs, etc...
    MODEL_INFO      : 2, // serialized model architecture + initial weights
    COMPILE_MODEL   : 3, // args to model.compile, e.g. optimizer, metrics 
    AVG_WEIGHTS     : 4, // weights to average into model
    WEIGHT_REQUEST  : 5, // ask for weights
}
Object.freeze(CMD_CODES) // make object immutable*/



/**
 * NOTE: peer.js seems to convert all array types to ArrayBuffer, making the original 
 * type unrecoverable (Float32Array, Uint8Array, ...). The solution is to encode any payload
 * with msgpack.encode, then decode at the destination.
 */


/**
 * Wrapper class that deals with PeerJS communication.
 */
export class PeerJS {
    /**
     * 
     * @param {Peer} local_peer Peer object (from PeerJS) instantiated for local machine
     * @param {function} handle_data function to be called on incoming data. It should take the 
     * incoming data as first argument. 
     * @param  {...any} handle_data_args args to handle_data
     */
    constructor(local_peer, handle_data, ...handle_data_args) {
        this.local_peer = local_peer
        this.data = null
        this.handle_data = handle_data
        this.handle_data_args = handle_data_args

        console.log("peer", local_peer)

        // specify what to do on connection from another peer
        this.local_peer.on("connection", (conn) => {
            console.log("new connection from", conn.peer)
            conn.on("data", async (data) => {
                this.data = data
                await this.handle_data(data, ...this.handle_data_args)
            })
        })
    }

    /**
     * Send data to remote peer
     * @param {Peer} receiver PeerJS remote peer (Peer object).
     * @param {object} data object to send
     */
    async send(receiver, data) {
        const conn = this.local_peer.connect(receiver);
        conn.on('open', () => {
            conn.send(data)
        })

    }

    /**
     * Change data handling function
     */
    set_data_handler(func, ...args) {
        this.handle_data = func
        this.handle_data_args = args
    }
}

/**
 * Send a serialized TFJS model to a remote peer
 * @param {TFJS model} model the model to send
 * @param {PeerJS} peerjs instance of PeerJS object
 * @param {String} receiver receiver name (must be registered in PeerJS server)
 * @param {String} name name to save the model with, can be anything
 */
export async function send_model(model, peerjs, receiver, name) {
    await store_model(model, name)
    var serialized = await get_serialized_model(name)
    console.log(serialized)
    const send_data = {
        cmd_code    : CMD_CODES.MODEL_INFO,
        payload     : msgpack.encode(serialized)
    }
    peerjs.send(receiver, send_data)
}

/**
 * Send data to a remote peer
 * @param {object} data data to send
 * @param {int} code code in CMD_CODES to identify what the data is for
 * @param {PeerJS} peerjs PeerJS object
 * @param {String} receiver name of receiver peer (must be registered in PeerJS server)
 */
export async function send_data(data, code, peerjs, receiver) {
    const send_data = {
        cmd_code    : code,
        payload     : msgpack.encode(data)
    }

    peerjs.send(receiver, send_data)
}

/**
 * Deserialize a received model 
 * @param {object} model_data serialized model
 */
export async function load_model(model_data) {
    var name = model_data.model_info.modelPath
    console.log(model_data)
    await store_serialized_model(model_data.model_info, model_data.model_data)
    const model = await tf.loadLayersModel('indexeddb://'.concat(name))

    return model
}

/**
 * Function given to PeerJS instance to handle incoming data
 * @param {object} data incoming data 
 * @param {object} buffer buffer to store data
 */
export async function handle_data(data, buffer) {
    console.log("Received new data: ", data)

    // convert the peerjs ArrayBuffer back into Uint8Array
    var payload = msgpack.decode(new Uint8Array(data.payload))
    switch(data.cmd_code) {
        case CMD_CODES.MODEL_INFO:
            buffer.model = payload
            break
        case CMD_CODES.ASSIGN_WEIGHTS:
            buffer.assign_weights = payload
            break
        case CMD_CODES.COMPILE_MODEL:
            buffer.compile_data = payload
            break
        case CMD_CODES.AVG_WEIGHTS:
            console.log(payload)
            if (buffer.avg_weights === undefined) {
                buffer.avg_weights = {}
            }

            const epoch = payload.epoch
            const weights = payload.weights

            if (buffer.avg_weights[epoch] === undefined) {
                buffer.avg_weights[epoch] = [weights]
            } else {
                buffer.avg_weights[epoch].push(weights)
            }
            console.log("#Weights: ", buffer.avg_weights[epoch].length)
            break
        case CMD_CODES.TRAIN_INFO:
            buffer.train_info = payload
            break
        case CMD_CODES.WEIGHT_REQUEST:
            if (buffer.weight_requests === undefined) {
                buffer.weight_requests = new Set([])
            }           
            buffer.weight_requests.add(payload.name) // peer name
            console.log("Weight request from: ", payload.name)

            break
    }
}

/**
 * Handle data exchange after training is finished
 */
export async function handle_data_end(data, buffer) {
    console.log("Received new data: ", data)

    // convert the peerjs ArrayBuffer back into Uint8Array
    var payload = msgpack.decode(new Uint8Array(data.payload))
    console.log(payload)
    switch(data.cmd_code) {
        case CMD_CODES.WEIGHT_REQUEST:
            // eslint-disable-next-line no-case-declarations
            const receiver = payload.name
            const epoch_weights = {epoch : buffer.last_update.epoch, weights : buffer.last_update.weights}
            console.log("Sending weights to: ", receiver)
            await send_data(epoch_weights, CMD_CODES.AVG_WEIGHTS, buffer.peerjs, receiver)
            break
    }
}