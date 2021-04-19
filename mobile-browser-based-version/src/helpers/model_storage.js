

    /**
     * Base directory in LocalStorage where models are stored.
     */
    const BASEDIR =  "tensorflowjs_models"

    /**
     * TFJS models are stored across multiple files, this returns a list of 
     * all of them.
     */
    const FILENAMES = [
            "info",
            "model_metadata",
            "model_topology",
            "weight_data",
            "weight_specs"
        ]
    

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

    console.log("Sending data", data)
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
async function handle_data_end(data, buffer) {
    console.log("Received new data: ", data)

    // convert the peerjs ArrayBuffer back into Uint8Array
    var payload = msgpack.decode(new Uint8Array(data.payload))
    switch(data.cmd_code) {
        case CMD_CODES.WEIGHT_REQUEST:
            // eslint-disable-next-line no-case-declarations
            const receiver = payload.name
            const epoch_weights = {epoch : buffer.epoch, weights : buffer.weights}
            console.log("Sending weights to: ", receiver)
            await send_data(epoch_weights, CMD_CODES.AVG_WEIGHTS, buffer.peerjs, receiver)
            break
    }
}