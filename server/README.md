# Disco Server

This project contains the helper server providing the APIs used by the decentralized and federated learning schemes available in `@epfml/discojs` and `@epfml/discojs-node`.

## Example Usage

You can quickly try the default server with

```sh
npm i -g @epfml/disco-server
disco-server
```

The above command will load the default Disco tasks. There is currently no way to add new tasks via this command.

If you want to add a new custom task via the server library, use the following package instead:

```sh
npm i @epfml/disco-server
```

Then in your code:
```js
import { Disco, tf } from '@epfml/disco-server'

// Define your own task provider (task definition + model)
const customTask = {
    getTask() {
      return {
        taskID: 'test',
        displayInformation: {
          taskTitle: 'Test task'
        },
        trainingInformation: {
          modelID: 'test-model',
          epochs: 5,
          roundDuration: 10,
          validationSplit: 0,
          batchSize: 30,
          modelCompileData: {
            optimizer: 'rmsprop',
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
          },
          dataType: 'tabular',
          inputColumns: [
            'Age',
          ],
          outputColumns: [
            'Output'
          ],
          scheme: 'Federated',
          noiseScale: undefined,
          clippingRadius: undefined
        }
      }
    },

    async getModel () {
      const model = tf.sequential()

      model.add(
        tf.layers.dense({
          inputShape: [1],
          units: 124,
          activation: 'relu',
          kernelInitializer: 'leCunNormal'
        })
      )
      model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

      return model
    }
  }

async function runServer() {
  const disco = new Disco()
  // Add default tasks provided by the server
  await disco.addDefaultTasks()
  // Add your own custom task
  await disco.addTask(customTask)

  // You can also provide your own task object containing the URL of the model
  await disco.addTask({
    ...
    trainingInformation: {
        modelID: 'test-model',
        epochs: 5,
        modelURL: 'https://example.com/path/to/your/model.json',
    }
    ...
  })

  // Or provide an URL separately
  await disco.addTask(customTask.getTask(), new URL('https://example.com/path/to/your/model.json'))

  // You can access the underlying Express Application if needed
  disco.server.use(yourMiddleware)

  // Start the server
  disco.serve()
}

runServer()
```

## HTTP API Specifications

### ML Tasks

In both learning schemes, the Disco server provides a list of trainable ML tasks to the Disco clients of the network. An ML task consists of:
- the neural network model
- the task parameters (such as descriptions, preprocessing, training modes)

Adding a new task server-side can be done in several ways. See the [task documentation](https://github.com/epfml/disco/tree/develop/docs/TASK.md) for more information.

Route | Method | Body | Action
-|-|-|-
`/tasks` | GET | — | Get the list of ML tasks (.json)
`/tasks`  | POST | Valid ML task (*) | Add a new ML task
`/tasks/:taskID/model.json` | GET | — | Download the model architecture file (.json) for task `taskID`
`/tasks/:taskID/:weightsFile` | GET | — | Download the model weights file (.bin) for task `taskID`

(*) See the [task documentation](https://github.com/epfml/disco/tree/develop/docs/TASK.md) for the exact expectations.

### Federated Learning

The server receives model weight updates from participants (clients), but never receives any training data. For every task, it keeps track of connected clients and weight updates, and periodically aggregates and serves the most recent weight updates.

All endpoints listed below are implemented as messages on a WebSocket, mounted on the `/feai/:taskID/:clientID/` route. It means the endpoints trigger their actions for task `taskID` as client `clientID`.

Message | From | To | Body | Action
-|-|-|-|-
`clientConnected` | Client | Server | — | Connect client `clientID` to task `taskID`
`postWeightsToServer` | Client | Server | Model weight updates | Send model weight updates
`latestServerRound` | Both | Both | — | Get the current training round and model weight updates

### Decentralized Learning

The server receives neither weight updates nor data, but keeps a list of available tasks and participants (clients) available for each task.

All endpoints listed below are implemented as messages on a WebSocket, mounted on the `/deai/:taskID/:clientID/` route. It means the endpoints trigger their actions for task `taskID` as client `clientID`.

Message | From | To | Body | Action
-|-|-|-|-
`clientConnected` | Client | Server | — | Connect client `clientID` to task `taskID`
`SignalForPeer` | Client | Server |
`PeerIsReady` | Client | Server |
`PeerID` | Server | Client |
`PeersForRound` | Server | Client |

For completeness, note that the Disco clients send the following messages to each other in a peer-to-peer fashion, i.e. without any intervention from the server.

Messsage | Body | Action
-|-|-
`Weights` | | Send model weight updates to the peer
`Shares` | | Secure Aggregation: Secret shares sent in first round
`PartialSums` | | Secure Aggregation: Partial sums sent in second round

## Development

### Requirements


If you need to develop while making change to the discojs lib, you will need to link the local package. (So that you are not using a fixed remote version of Disco)

To install the dependencies, run

```sh
npm ci
npm link ../discojs/discojs-node # If you need local lib for development
```

This server also requires the [@epfml/discojs-node](https://github.com/epfml/disco/tree/develop/discojs/discojs-node/README.md) package. If you wish to develop the server with your own local changes brought to `@epfml/discojs-node`, link (`npm link`) the `discojs/discojs-node` project. Then, make sure `discojs/discojs-node` is *built* before proceeding to the next steps, by following the `@epfml/discojs-node` [README](https://github.com/epfml/disco/tree/develop/discojs/README.md).

### Running the server locally

From this folder, you can run the server on localhost:8080 with `npm run dev`. This runs via the `nodemon` package, so it automatically restarts the process after changes.

### Testing the server locally

To run sever unit testing run `npm run test`. Make sure you are not running a server at the same time as the test suite will run a server to test on. We use [mocha](https://mochajs.org/), [chai](https://www.chaijs.com/) and [supertest](https://github.com/visionmedia/supertest) for testing; respectively they are libraries: unit tests, assertions, and http testing.

### Writing your own tests

Server tests live in the `server/tests/` folder. All files ending with the `.spec.ts` extension written in this folder will be run as tests. Simply write a new `your_own_test.spec.ts` file to include it in the testing pipeline.

### Testing the servers before deploying

The server is deployed inside a docker container, thus before deploying it, we can locally test the container to see if any new dependencies work (The container runs a 20.04 Ubuntu server). See [docker guide](https://docs.docker.com/get-started/) if you have not used docker and or need to install it.

To test the server do the following steps:

```sh
sudo docker build -t disco-server .
```

This builds the docker image, and then run it:

```sh
sudo docker run -p 8080:8080 disco-server:latest
```

> **⚠ WARNING: Using VPN while running docker**
> If you are running a, VPN docker might not properly work, e.g. `http://localhost:8080/` will result in `page not found`.

### Deploying the Server to the Cloud

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

> **⚠ WARNING: make sure you allocate enough memory!**

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

## Extra special dev notes

```bash
$ (cd discojs && ./build.sh)
$ (cd server && npm ci && npm link ../discojs/discojs-node && npm run dev)
$ (cd web-client && npm ci && npm link ../discojs/discojs-node && npm run dev)
```
