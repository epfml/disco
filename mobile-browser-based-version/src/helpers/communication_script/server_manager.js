import * as tf from "@tensorflow/tfjs"
const path = require('path')


export const SERVER_API = {
    PEER_SERVER: {
        PATH: 'peerjs',
        KEY: 'api',
        PEERS: 'peers'
    },
    TASKS: {
        PATH: 'tasks',
        MODEL: 'model.json'
    }
}
Object.freeze(SERVER_API)


export class ServerManager {

    constructor() {
        this.initialized = false
        this.host = null
        this.port = null
        this.protocol = null
        this.serverUrl = null
    }

    setParams(host, port, protocol='http') {
        if (!this.initialized) {
          this.host = host
          this.port = port
          this.protocol = protocol
          this.serverUrl = this.constructUrl()

          this.initialized = true
          Object.freeze(this)
          return this
        }
    }

    constructUrl() {
      return this.protocol + '://' +
             this.host + ':' +
             String(this.port) + '/'
    }

    async getPeersList() {
      let peerServer = SERVER_API.PEER_SERVER
      return fetch(this.serverUrl + path.join(peerServer.PATH, peerServer.KEY, peerServer.PEERS))
    }

    async getTasks() {
      console.log(path.join(this.serverUrl, SERVER_API.TASKS.PATH))
      return fetch(this.serverUrl + SERVER_API.TASKS.PATH)
    }

    async getTaskModel(taskId) {
      let tasks = SERVER_API.TASKS
      return tf.loadLayersModel(this.serverUrl + path.join(tasks.PATH, taskId, tasks.MODEL))
    }
}

export const serverManager = new ServerManager()
