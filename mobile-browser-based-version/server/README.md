## DeAI Server
Centralized helper server for DeAI clients, running as an ExpressJS app. The server requires [Node](https://nodejs.org/en/), [Express](https://expressjs.com/), [PeerServer](https://github.com/peers/peerjs-server) and [Tensorflow](https://www.tensorflow.org/js). All library requirements are included in the ```package.json``` file.
### Components
#### PeerJS server
The PeerServer stores the entire list of connected peers, which the peers need to correctly communicate between one another. It centralizes the peer id generation, which is assigned to peers on connection. The server uses an API key, simply set to "api" for convenience (can be easily changed later on). The list of peers is publicly accessible through:

- ```/peerjs```: PeerServer home page
- ```/peerjs/api/peers```: list of connected peers (id)

#### Tasks

The training tasks given to DeAI clients are centralized on this server. Their descriptions as well as their model architectures must be made available to all peers, which is achieved via the following routing paths:

- ```/tasks```: JSON file containing meta-data (including task id) on all available DeAI training tasks
- ```/tasks/task_id```: Tensorflow model for the given task id

Tasks are stored in ```tasks.json```. The models are declared in ```models.js```.

### Running the server

From this folder, you can run the server on localhost:port with the following command:
```
npm start port tasks_file
```
specifying the desired port and tasks JSON file.
