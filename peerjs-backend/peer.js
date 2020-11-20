//const msgpack = require("msgpack-lite");


// trying to reproduce an Enum
const CMD_CODES = {
    ASSIGN_WEIGHTS  : 0,
    TRAIN_INFO      : 1,
    MODEL_INFO      : 2,
}

Object.freeze(CMD_CODES)

class PeerJS {
    constructor(local_peer, handle_data, ...handle_data_args) {
        this.local_peer = local_peer
        this.data = null
        this.handle_data = handle_data
        this.handle_data_args = handle_data_args

        console.log(local_peer)
        this.local_peer.on("connection", (conn) => {
            console.log("new connection")
            conn.on("data", (data) => {
                this.data = data
                this.new_data = true
                this.handle_data(data, ...this.handle_data_args)
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

