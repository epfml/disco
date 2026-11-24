# DISCO `server`

This module contains the helper server providing the APIs used by the decentralized and federated learning schemes.

## Launching a `server` instance

To run the local server implementation of this folder run:

```
pnpm -F server start # from the root level
```

Alternatively, you can start a server instance via the NPM package:

```sh
npm i -g @epfml/disco-server # (also works with pnpm)
disco-server
```

## HTTP API Specifications

### ML Tasks

In both learning schemes, the DISCO server provides a list of trainable ML tasks to clients in the network. An ML task consists of:

- the neural network model
- the task parameters (such as descriptions, preprocessing, training modes)

Adding a new task server-side can be done in several ways. See [TASK.md](https://github.com/epfml/disco/tree/main/docs/TASK.md) for more information.

| Route                         | Method | Body               | Action                                                         |
| ----------------------------- | ------ | ------------------ | -------------------------------------------------------------- |
| `/tasks`                      | GET    | —                  | Get the list of public ML tasks (.json)                        |
| `/tasks`                      | POST   | Valid ML task (\*) | Add a new ML task                                              |
| `/tasks/:taskID`              | GET    | —                  | Get task `taskID` (.json), private ones need their token       |
| `/tasks/:taskID/model.json`   | GET    | —                  | Download the model architecture file (.json) for task `taskID` |
| `/tasks/:taskID/:weightsFile` | GET    | —                  | Download the model weights file (.bin) for task `taskID`       |

(\*) See the [task documentation](https://github.com/epfml/disco/tree/main/docs/TASK.md) for the exact requirements.

The body of `POST /tasks` is a JSON object with the serialized `task` and its `model`, either the ID of a model listed by `GET /models` or an encoded model to upload. Anyone can create a task.

Add `"private": true` to create a private task. The response is then `{ "token": "…" }`, a random 256-bit token granting access to the task. The server only keeps a SHA-256 hash of it, so this response is the only time the token is given: whoever creates the task has to share it with the participants. A private task isn't listed by `GET /tasks`: clients get it from `GET /tasks/:taskID`, and its model files from `GET /tasks/:taskID/model.json` and `GET /tasks/:taskID/:weightsFile`, by sending the token in an `Authorization: Bearer <token>` header. Without a valid token, these routes answer 404 as if the task didn't exist, so that private task IDs can't be probed for. Like every task added at runtime, private tasks are kept in memory only and are lost when the server restarts.

### Federated Learning

The server receives model weight updates from participants (clients), but never receives any training data. For every task, it keeps track of connected clients and weight updates, and periodically aggregates and serves the most recent weight updates.

All endpoints listed below are implemented as messages on a WebSocket, mounted on the `/federated/:taskID/:clientID/` route. It means the endpoints trigger their actions for task `taskID` as client `clientID`.

| Message               | From   | To     | Body                 | Action                                                  |
| --------------------- | ------ | ------ | -------------------- | ------------------------------------------------------- |
| `clientConnected`     | Client | Server | `token`, optional    | Connect client `clientID` to task `taskID`              |
| `postWeightsToServer` | Client | Server | Model weight updates | Send model weight updates                               |
| `latestServerRound`   | Both   | Both   | —                    | Get the current training round and model weight updates |

Joining a private task requires its token in the `token` field of `clientConnected`. It is sent in the message rather than in the WebSocket URL, which ends up in proxy and access logs. Without a valid token, the server closes the socket with code 4403 (`mtype.INVALID_TOKEN_CLOSE_CODE`) before the client joins, so the other participants never hear about it. The same goes for decentralized learning.

### Decentralized Learning

The server receives neither weight updates nor data, but keeps a list of available tasks and participants (clients) available for each task.

All endpoints listed below are implemented as messages on a WebSocket, mounted on the `/decentralized/:taskID/:clientID/` route. It means the endpoints trigger their actions for task `taskID` as client `clientID`.

| Message           | From   | To     | Body              | Action                                     |
| ----------------- | ------ | ------ | ----------------- | ------------------------------------------ |
| `clientConnected` | Client | Server | `token`, optional | Connect client `clientID` to task `taskID` |
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

## Deployment

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
pnpm -F server test
```

> [!WARNING]
> If you are running a VPN, docker might not properly work, e.g. `http://localhost:8080/` will result in `page not found`.
