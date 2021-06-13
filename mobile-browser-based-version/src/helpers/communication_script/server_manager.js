export const SERVER_API = {
    PEER_SERVER: {
        PATH: 'peerjs/',
        KEY: 'api/',
        PEERS: 'peers/'
    },
    TASKS: 'tasks/',
    TOPOLOGY: 'topology/'
}


export class ServerManager {
    constructor(host, port, protocol='http') {
        // Suggestion: make host and port constants in SERVER_API object
        this.host = host
        this.port = port
        this.protocol = protocol
        this.serverUrl = this.constructUrl()
    }

    constructUrl() {
      return this.protocol + '://' +
             this.serverConfig.host + '/' +
             String(this.serverConfig.port) + '/'
    }

    async getPeersList() {
      let peerServer = SERVER_API.PEER_SERVER
      return fetch(this.serverUrl + peerServer.PATH + peerServer.KEY + peerServer.PEERS)
    }

    async getTasks() {
      return fetch(this.serverUrl + SERVER_API.TASKS)
    }

    async getTaskModel(taskId) {
      return fetch(this.serverUrl + SERVER_API.TASKS + taskId)
    }
}
