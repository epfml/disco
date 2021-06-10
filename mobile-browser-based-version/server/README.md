## DeAI Server
Centralized helper server for DeAI clients. The server requires [Node](https://nodejs.org/en/), [Express](https://expressjs.com/), [PeerServer](https://github.com/peers/peerjs-server) and [Tensorflow](https://www.tensorflow.org/js). All these requirements are included in the project's ```package.json``` file.
### Components
#### PeerJS server
The PeerServer stores the entire list of connected peers, which the peers need to correctly communicate between one another. It centralizes the peer id generation, which is assigned to peers on connection. The server uses an API key, simply set to "api" for convenience (can be easily changed later on). The list of peers is publicly accessible through:

- ```/peerjs```: PeerServer home page
- ```/peerjs/api/peers```: list of connected peers (id)

#### Tasks

The training tasks given to DeAI clients are centralized on this server. Their descriptions as well as their model architectures must be made available to all peers, which is achieved via the following routing paths:

- ```/tasks```: JSON file containing meta-data (including task id) on all available DeAI training tasks
- ```/tasks/task_id```: Tensorflow model for the given task id

Tasks are stored in the ```tasks.json``` file.
#### Topology
On node connection, add its peer id to the network topology. Remove it on disconnection. The connection-disconnection part is handled by PeerJS and PeerServer directly via events, while the topology is managed by ```topologies.js```.
- ```/neighbours/peer_id```: get the peer's neighbours list in the network
### Running the server

From this folder, you can run the server on localhost:port with the following commands:
```
node run_server.js port tasks_file
```
