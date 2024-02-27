# DISCO `server`

This module contains the helper server providing the APIs used by the decentralized and federated learning schemes.

## Launching a `server` instance

To run the local server implementation of this folder run:

```
npm -w server start # from the root level
```

Alternatively, you can start a server instance via the NPM package:

```sh
npm i -g @epfml/disco-server
disco-server
```

## HTTP API Specifications

### ML Tasks

In both learning schemes, the DISCO server provides a list of trainable ML tasks to clients in the network. An ML task consists of:

- the neural network model
- the task parameters (such as descriptions, preprocessing, training modes)

Adding a new task server-side can be done in several ways. See [TASK.md](https://github.com/epfml/disco/tree/develop/docs/TASK.md) for more information.

| Route                         | Method | Body               | Action                                                         |
| ----------------------------- | ------ | ------------------ | -------------------------------------------------------------- |
| `/tasks`                      | GET    | —                  | Get the list of ML tasks (.json)                               |
| `/tasks`                      | POST   | Valid ML task (\*) | Add a new ML task                                              |
| `/tasks/:taskID/model.json`   | GET    | —                  | Download the model architecture file (.json) for task `taskID` |
| `/tasks/:taskID/:weightsFile` | GET    | —                  | Download the model weights file (.bin) for task `taskID`       |

(\*) See the [task documentation](https://github.com/epfml/disco/tree/develop/docs/TASK.md) for the exact requirements.

### Federated Learning

The server receives model weight updates from participants (clients), but never receives any training data. For every task, it keeps track of connected clients and weight updates, and periodically aggregates and serves the most recent weight updates.

All endpoints listed below are implemented as messages on a WebSocket, mounted on the `/feai/:taskID/:clientID/` route. It means the endpoints trigger their actions for task `taskID` as client `clientID`.

| Message               | From   | To     | Body                 | Action                                                  |
| --------------------- | ------ | ------ | -------------------- | ------------------------------------------------------- |
| `clientConnected`     | Client | Server | —                    | Connect client `clientID` to task `taskID`              |
| `postWeightsToServer` | Client | Server | Model weight updates | Send model weight updates                               |
| `latestServerRound`   | Both   | Both   | —                    | Get the current training round and model weight updates |

### Decentralized Learning

The server receives neither weight updates nor data, but keeps a list of available tasks and participants (clients) available for each task.

All endpoints listed below are implemented as messages on a WebSocket, mounted on the `/deai/:taskID/:clientID/` route. It means the endpoints trigger their actions for task `taskID` as client `clientID`.

| Message           | From   | To     | Body | Action                                     |
| ----------------- | ------ | ------ | ---- | ------------------------------------------ |
| `clientConnected` | Client | Server | —    | Connect client `clientID` to task `taskID` |
| `SignalForPeer`   | Client | Server |
| `PeerIsReady`     | Client | Server |
| `PeerID`          | Server | Client |
| `PeersForRound`   | Server | Client |

For completeness, note that the Disco clients send the following messages to each other in a peer-to-peer fashion, i.e. without any intervention from the server.

| Message       | Body | Action                                                |
| ------------- | ---- | ----------------------------------------------------- |
| `Weights`     |      | Send model weight updates to the peer                 |
| `Shares`      |      | Secure Aggregation: Secret shares sent in first round |
| `PartialSums` |      | Secure Aggregation: Partial sums sent in second round |

## Deployment

### Testing before deploying

The server is deployed inside a docker container, thus before deploying it, we can locally test the container to see if any new dependencies work (the container runs a 20.04 Ubuntu server). See [docker guide](https://docs.docker.com/get-started/) if you have not used docker and or need to install it.

To test the server do the following steps:

```sh
sudo docker build -t disco-server .
```

This builds the docker image, and then run it:

```sh
sudo docker run -p 8080:8080 disco-server:latest
```

You can now start the `server` test suite as usual:

```sh
npm -w server test
```

> [!WARNING]
> If you are running a VPN, docker might not properly work, e.g. `http://localhost:8080/` will result in `page not found`.

### Deploying to the Cloud

#### Google App Engine

Google App Engine (GAE) creates an HTTPS certificate automatically, making this the easiest way to deploy the helper server in the Google Cloud Platform.

Since we need to install some required dependencies we deploy using Docker, we do this by choosing:

```yml
runtime: custom
```

in the `app.yaml` file.

Deployment files:

- `app.yaml` - GAE app config file.
- `Dockerfile` - Docker [commands](https://docs.docker.com/engine/reference/builder/) we specify.
- `.dockerignore` - Files to ignore while building the image, e.g. `node_modules/`.

To change the GAE app configuration, you can modify the file `app.yaml`.

> [!WARNING]
> Make sure you allocate enough memory!

Note that the size of the container can be quite large (e.g 600mb), if the alloted memory is too small then there might be 503 [errors](https://groups.google.com/g/google-appengine/c/BawYguWHq7Q) when deploying that hard tricky to debug.

To deploy the app on GAE, you can run the following command, where disco-313515 is the current PROJECT-ID:

```sh
gcloud app deploy --project=deai-313515 app.yaml --version prod
```

:exclamation: Important!
| :exclamation: This is very important |
|-----------------------------------------|
When deploying check that in the google cloud console -> app engine -> versions, that no new instance is created as this will increase the cloud costs.
This should not happen in principle due to the "--version dev" flag, it is however a good idea to check this the first time you run this command.

Some useful resources:

- [Docker sample app](https://docs.docker.com/get-started/02_our_app/)
- [Dockerfile reference](https://docs.docker.com/engine/reference/builder/#from)
- [GAE sample app](https://cloud.google.com/appengine/docs/standard/nodejs/building-app/deploying-web-service)

#### Docker

In the docker container we specify the environment and what dependencies to install. Perhaps most importantly, once this is this done, we specify:

1. npm run build
2. npm run start

The first line compiles the ts code into js, and the second one then runs the compiled code.
