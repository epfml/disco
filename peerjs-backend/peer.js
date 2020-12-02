//const msgpack = require("msgpack-lite");


// trying to reproduce an Enum
const CMD_CODES = {
    ASSIGN_WEIGHTS  : 0,
    TRAIN_INFO      : 1,
    MODEL_INFO      : 2,
    COMPILE_MODEL   : 3,
    AVG_WEIGHTS     : 4,
}

Object.freeze(CMD_CODES)

class PeerJS {
    constructor(local_peer, handle_data, ...handle_data_args) {
        this.local_peer = local_peer
        this.data = null
        this.handle_data = handle_data
        this.handle_data_args = handle_data_args

        console.log("peer", local_peer)
        this.local_peer.on("connection", (conn) => {
            console.log("new connection")
            conn.on("data", async (data) => {
                this.data = data
                this.new_data = true
                await this.handle_data(data, ...this.handle_data_args)
            })
        })
    }

    async send(receiver, data) {
        const msg = msgpack.encode(data);
        const conn = this.local_peer.connect(receiver)
        conn.on('open', () => {
            conn.send(data)
        })
    }

    get_data() {
        this.new_data = false
        return this.data
    }
}

// TODO: this doesn't need to be a class...
class ModelStorage {

    static get BASEDIR() {
        return "tensorflowjs_models"
    }

    static get FILENAMES() {
        return [
            "info",
            "model_metadata",
            "model_topology",
            "weight_data",
            "weight_specs"
        ]
    }

    static async store(model, name) {
        await model.save("localstorage://" + name)
    }

    static inject(model_data, name) {
        for(var i = 0; i < this.FILENAMES; i++) {
            var key = this.FILENAMES[i]
            var fpath = this.BASEDIR + '/' + name + '/' + key
            var content = model_data[key]
            localStorage.setItem(fpath, content)
        }
    }

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

async function send_model(model, peerjs, receiver, name) {
    await ModelStorage.store(model, name)
    var serialized = ModelStorage.get_serialized_model(name)
    const send_data = {
        cmd_code    : CMD_CODES.MODEL_INFO,
        payload     : serialized
    }
    console.log("Sending model data")
    console.log(send_data)
    peerjs.send(receiver, send_data)
}

function send_data(data, code, peerjs, receiver) {
    const send_data = {
        cmd_code    : code,
        payload     : data
    }

    console.log("Sending data")
    console.log(send_data)
    peerjs.send(receiver, send_data)
}


async function load_model(model_data) {
    var name = model_data.name
    ModelStorage.inject(model_data, name)
    const model = await tf.loadLayersModel("localstorage://" + name)
    
    return model
}

async function handle_data(data, buffer) {
    console.log("Received new data!")
    console.log(data)
    switch(data.cmd_code) {
        case CMD_CODES.MODEL_INFO:
            buffer.model = data.payload
            break
        case CMD_CODES.ASSIGN_WEIGHTS:
            buffer.assign_weights = data.payload
            break
        case CMD_CODES.COMPILE_MODEL:
            buffer.compile_data = data.payload
            break
        case CMD_CODES.AVG_WEIGHTS:
            buffer.avg_weights = data.payload
            break
        case CMD_CODES.TRAIN_INFO:
            buffer.train_info = data.payload
            break
    }
}