## DeAI Helper Server

Centralized helper server for DeAI clients, running as an ExpressJS app. The server requires [Node](https://nodejs.org/en/), [Express](https://expressjs.com/), [PeerServer](https://github.com/peers/peerjs-server) and [Tensorflow](https://www.tensorflow.org/js). All library requirements are included in the `package.json` file.

### Components

#### PeerJS server

The PeerServer stores the entire list of connected peers, which the peers need to correctly communicate between one another. It centralizes the peer id generation, which is assigned to peers on connection. The server uses an API key, simply set to "api" for convenience (can be easily changed later on). The list of peers is publicly accessible through:

- `/peerjs`: PeerServer home page
- `/peerjs/api/peers`: list of connected peers (id)

#### Tasks

The training tasks given to DeAI clients are centralized on this server. Their descriptions as well as their deep learning model architectures must be made available to all peers, which is achieved via the following routing paths:

- `/tasks`: JSON file containing meta-data (including task id) on all available DeAI training tasks
- `/tasks/task_id/{model.json, weights.bin}`: Tensorflow neural network model files for the given task id (model architecture & initialization weights)

Tasks are stored in `tasks.json`. The models are declared in `models.js`.

#### Creating a new task

Adding a new task server-side can easily be done by following the next steps:

- add an entry to `tasks.json` with the task's parameters
- add a `createModel` function to `models.js` with the task's model architecture and export it

### Running the helper server

From this folder, you can run the server on localhost:8080 with the following command:

```
npm start
```

### Running in Google App Engine

Google App Engine (GAE) creates an HTTPS certificate automatically, making this the easiest way to deploy the helper server in the Google Cloud Platform.

To change the GAE app configuration, you can modify the file `app.yaml`. Do not modify the flex enviroment because it is required for WebSocket support, which is required for PeerJS.

To deploy the app on GAE, you can run the following command, replacing PROJECT-ID with the your project ID:

```
gcloud app deploy --project=PROJECT-ID --promote --quiet app.yaml
```
