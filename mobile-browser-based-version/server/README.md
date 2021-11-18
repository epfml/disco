## FeAI Helper Server

Centralized helper server for FeAI clients, running as an ExpressJS app. The server mainly requires [Node](https://nodejs.org/en/), [Express](https://expressjs.com/), and [Tensorflow](https://www.tensorflow.org/js). All library requirements are included in the `package.json` file.

### Components

#### Server

The server keeps track of connected clients and weights from each client and communication round. It provides the following endpoints.

- `GET` requests publicly available without prior connection
  - connect client with ID `id` to task `task`
    ```
    URL: /connect/<task>/<id>
    ```
  - disconnect client with ID `id` from task `task`
    ```
    URL: /disconnect/<task>/<id>
    ```
  - access logs containing all training communication history made with the server (see POST requests below)
    ```
    URL: /logs?id=<id>&task=<task>&round=<round>
    ```

- `POST` requests with required prior connection and body `{ id, timestamp, [data]}`, where the client ID and request timestamp are required for logging
  - client sends their individual weights `weights` for communication round `round` and task `task`. 
    ```
    URL: /send_weights/<task>/<round>
    Body: { id: String, timestamp: Date, weights: Buffer  }
    ```
  - client receives averaged weights for communication round `round` and task `task`
    ```
    URL: /receive_weights/<task>/<round>
    Body: { id: String, timestamp: Date }
    ```
  - client sends their individual number of data samples `samples` for communication round `round` and task `task`
    ```
    URL: /send_nbsamples/<task>/<round>
    Body: { id: String, timestamp: Date, samples: Number }
    ```
  - client receives the number of data samples per client ID for communication round `round` and task `task`
    ```
    URL: /receive_data_info/<task>/<round>
    Body: { id: String, timestamp: Date }
    ```

#### Tasks

The training tasks given to FeAI clients are centralized on this server. Their descriptions as well as their deep learning model architectures must be made available to all clients, which is achieved via the following `GET` request routes.

- JSON file containing meta-data (including task id) on all available FeAI training tasks
  ```
  URL: /tasks
  ```
- Tensorflow neural network model files for the given task `task` (model architecture & initialization weights)
  ```
  URL: /tasks/<task>/{model.json, weights.bin}
  ```

Tasks are stored in `tasks.json`. The models are declared in `models.js`.

#### Creating a new task

Adding a new task server-side can easily be done by following the next steps:

- add an entry to `tasks.json` with the task's parameters
- add a `createModel` function to `models.js` with the task's model architecture and export it

### Running the helper server

From this folder, you can run the server on localhost:8081 with `npm start`

Google App Engine (GAE) creates an HTTPS certificate automatically, making this the easiest way to deploy the helper server in the Google Cloud Platform.

To change the GAE app configuration, you can modify the file `app.yaml`.

To deploy the app on GAE, you can run the following command, replacing PROJECT-ID with the your project ID:

```
gcloud app deploy --project=PROJECT-ID --promote --quiet app.yaml
```
