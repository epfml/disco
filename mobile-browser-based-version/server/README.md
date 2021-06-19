## DeAI Server

Centralized helper server for DeAI clients, running as an ExpressJS app. The server mainly relies on [Node](https://nodejs.org/en/), [Express](https://expressjs.com/), [PeerJS Server](https://github.com/peers/peerjs-server) and [Tensorflow](https://www.tensorflow.org/js). All additional library requirements are included in the ```package.json``` file.

## Components

### PeerJS server
The PeerJS server stores the entire list of connected peers, which the peers need to correctly communicate between one another. It centralizes the peer id generation, which is assigned to peers on connection. The server uses an API key, simply set to "api" for convenience (can be easily changed later on). The list of peers is publicly accessible through:

- ```/peerjs```: PeerServer home page
- ```/peerjs/api/peers```: list of connected peers (id)

### Tasks

The training tasks given to DeAI clients are centralized on this server. Their descriptions as well as their deep learning model architectures must be made available to all peers, which is achieved via the following routing paths:

- ```/tasks```: JSON file containing meta-data (including task id) on all available DeAI training tasks
- ```/tasks/task_id/{model.json, weights.bin}```: Tensorflow neural network model files for the given task id (model architecture & initialization weights)

Tasks are stored in ```tasks.json```. The models are declared in ```models.js```.

#### Creating a new task

Adding a new task server-side can easily be done by following the next steps:

- add an entry to `tasks.json` with the task's parameters
- add a `createModel` function to `models.js` with the task's model architecture, don't forget to export it

### Running the server

From this folder, you can run the server on localhost:port with the following command:
```
npm start port tasks_file
```
specifying the desired port and tasks JSON file.
