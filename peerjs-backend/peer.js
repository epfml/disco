/**
 * This object contains codes to identify what the incoming data 
 * should be used for, e.g. to build the model, average the weights etc...
 */
// trying to reproduce an Enum
const CMD_CODES = {
    ASSIGN_WEIGHTS  : 0, // inject weights into model (unused)
    TRAIN_INFO      : 1, // n. epochs, etc...
    MODEL_INFO      : 2, // serialized model architecture
    COMPILE_MODEL   : 3, // args to model.compile, e.g. optimizer, metrics 
    AVG_WEIGHTS     : 4, // weights to average into model
    WEIGHT_REQUEST  : 5, // ask for weights
}
Object.freeze(CMD_CODES) // make object immutable

/**
 * NOTE: peer.js seems to convert all array types to ArrayBuffer, making the original 
 * type unrecoverable (Float32Array, Uint8Array, ...). The solution is to encode any payload
 * with msgpack.encode, then decode at the destination.
 */


/**
 * Wrapper class that deals with PeerJS communication.
 */
class PeerJS {
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
        const conn = this.local_peer.connect(receiver)
        conn.on('open', () => {
            conn.send(data)
        })
    }
}

/**
 * This class deals with storing and retrieving the TFJS model 
 * from the browser's LocalStorage. It doesn't really need to be a 
 * class as everything is static... maybe it should just be a module
 * with a collection of functions.
 */
class ModelStorage {

    /**
     * Base directory in LocalStorage where models are stored.
     */
    static get BASEDIR() {
        return "tensorflowjs_models"
    }

    /**
     * TFJS models are stored across multiple files, this returns a list of 
     * all of them.
     */
    static get FILENAMES() {
        return [
            "info",
            "model_metadata",
            "model_topology",
            "weight_data",
            "weight_specs"
        ]
    }

    /**
     * Store TFJS model in LocalStorage.
     * @param {TFJS model} model 
     * @param {String} name name of model to store (can be anything)
     */
    static async store(model, name) {
        await model.save("localstorage://" + name)
    }

    /**
     * Save serialized model to LocalStorage for future loading
     * @param {object} model_data serialized model
     * @param {String} name name, can be anything
     */
    static inject(model_data, name) {
        for(var i = 0; i < this.FILENAMES; i++) {
            var key = this.FILENAMES[i]
            var fpath = this.BASEDIR + '/' + name + '/' + key
            var content = model_data[key]
            localStorage.setItem(fpath, content)
        }
    }

    /**
     * Get serialized model from LocalStorage
     * @param {String} name name used to save the model
     */
    static get_serialized_model(name) {
        var serialized = {}
        for(var i = 0; i < this.FILENAMES.length; i++) {
            var key = this.FILENAMES[i]
            var fpath = this.BASEDIR + '/' + name + '/' + key

            var model_data = localStorage.getItem(fpath) // this is a JSON string
            serialized[key] = model_data
        }
        serialized.name = name
        return serialized
    }
}

/**
 * Send a serialized TFJS model to a remote peer
 * @param {TFJS model} model the model to send
 * @param {PeerJS} peerjs instance of PeerJS object
 * @param {String} receiver receiver name (must be registered in PeerJS server)
 * @param {String} name name to save the model with, can be anything
 */
async function send_model(model, peerjs, receiver, name) {
    await ModelStorage.store(model, name)
    var serialized = ModelStorage.get_serialized_model(name)
    const send_data = {
        cmd_code    : CMD_CODES.MODEL_INFO,
        payload     : msgpack.encode(serialized)
    }
    console.log("Sending model data")
    console.log(send_data)
    peerjs.send(receiver, send_data)
}

/**
 * Send data to a remote peer
 * @param {object} data data to send
 * @param {int} code code in CMD_CODES to identify what the data is for
 * @param {PeerJS} peerjs PeerJS object
 * @param {String} receiver name of receiver peer (must be registered in PeerJS server)
 */
function send_data(data, code, peerjs, receiver) {
    const send_data = {
        cmd_code    : code,
        payload     : msgpack.encode(data)
    }

    console.log("Sending data")
    console.log(send_data)
    peerjs.send(receiver, send_data)
}

/**
 * Deserialize a received model 
 * @param {object} model_data serialized model
 */
async function load_model(model_data) {
    var name = model_data.name
    ModelStorage.inject(model_data, name)
    const model = await tf.loadLayersModel("localstorage://" + name)
    
    return model
}

/**
 * Function given to PeerJS instance to handle incoming data
 * @param {object} data incoming data 
 * @param {object} buffer buffer to store data
 */
async function handle_data(data, buffer) {
    console.log("Received new data: ", data)

    // convert the peerjs ArrayBuffer back into Uint8Array
    payload = msgpack.decode(new Uint8Array(data.payload))
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
            buffer.weight_req_epoch = payload
            break
    }
}