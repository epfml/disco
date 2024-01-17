# `Disco.js` under the hood

This guide goes over how the core logic is structured and what are the main abstractions of Disco.js, implemented in `discojs/discojs-core`.
As described in the [developer guide](../DEV.md), `discojs-node` and `discojs-web` are simple wrappers allowing to use `discojs-core` code from different platforms and technology, namely, a browser or Node.js. 

### Terminology

Many terms are used in DISCO and unfortunately they are not always used in the same ways. Here is an attempt to clarifying and present the main terms and concepts as well as how they relate to each other:
* A `node` is any machine in a network, which can be a server or a client.
* A `client` or a `user` is a node with local data and performing local model updates. In other words, a client  refers to any node participating in distributed learning that isn't the server. Note that in Disco.js, a client is represented by multiple abstractions, such as the `Client` and the `Trainer`. Therefore, the `Client` class only implements parts of what everything a `client` does in distributed learning and mostly handles communications with the server or other clients.
* `peer` is synonym to `client` or `user` in decentralized learning, following the peer-to-peer setting.
* The `server` is the node listening to incoming requests from other nodes. There is a single server in a distributed task.
* A `task` refers to the training of one model, whether distributed or not. Accordingly, multiple tasks may happen in parallel.

### Federated learning

> [!Tip]
> Some knowledge about distributed learning is necessary to understand Disco.js' implementation. For instance, you can have a look at [this paper](https://arxiv.org/abs/1912.04977), written by the Google researchers that coined the term "Federated Learning", reviewing the advances and open areas of distributed learning at the time of 2019.

For simplicity, we will talk mostly of federated learning. In the relevant cases, we specify how the decentralized scheme differ. The typical scenario of federated learning involves multiple clients and one server. Each client pulls model weights from the server and train the model on their local data. After a few iterations, potentially asynchronously, clients push their new respective weights to the server, which aggregates the weights into a new model after receiving enough updates. The clients then pull the new model weights and starting training locally again. In decentralized learning, clients mostly interect between each other but still communicate with the server, for example to get a list of peers participating in the session. 

See here a schema of the main objects in Disco.js:

```mermaid
flowchart LR
    subgraph client_side [Client Side]
    node([Node])-->|instantiate|Disco
    Disco-->|attribute|Trainer
    Disco-->|attribute|Client
    end
    Client<-->|communicate|Server

```
In the following, we introduce the Disco.js objects and finish with a schema summarizing the interactions between them.

The main object of Disco.js is the `Disco` class, which orchestrate different classes that enable distributed learning. These classes are the `Trainer` and the `Client`, the former handles training and the latter deals with communication. Since different training and communication schemes are available, these classes are abstract and various children classes exist for the different schemes (e.g., `FederatedClient` for federated communication with a central server).
Once you understand how these classes work you will have a good grasp of DISCO. The rest of the classes mostly deal with building these objects and making them work together.

> [!Note]
> In order to focus on the essentials, most of the following code snippets will be incomplete with respect to the actual code

## Client

The `Client` class mostly handles sending and receiving weights from the current client to the server (or other peers in decentralized learning). `Client` is an abstract class that requires the methods such as `onRoundEndCommunication` to be implemented. Currently, the two classes implementing `Client` are the `FederatedClient` and the `DecentralizedClient`. For simplicity, we explain here how the 
`FederatedClient` works.

After some local training iterations, the client first pushes its weights to the server and waits to receive new aggregated weights, if any.
If there are no new weights the client continues performing updates with the current model.

> [!Note]
> In the current implementation, we keep track of both the current and previous weights in order to implement Differential Privacy.

```js
async onRoundEndCommunication (
    weights: WeightsContainer,
    round: number,
    trainingInformant: informant.FederatedInformant
  ): Promise<void> {

    
    await this.sendPayload(this.aggregator.makePayloads(weights).first()) // Send the local weights to the server
    
    await this.receiveResult()      // Fetch the server result or timeout after some time
                                    // The result is stored in this.serverResult

    if (this.serverResult !== undefined) { // Save the weights if the result is not undefined
        this.aggregator.add(Base.SERVER_NODE_ID, this.serverResult, round, 0) // add the new weights to the aggregator
    }
  }
```
In the federated case, adding the server result to the "aggregator" will let the trainer use these weights in the next round.

## Trainer

The `Trainer` class is instantiated by client nodes and contains all the code relevant for local training. Its main method is `fitModel`, which trains a model on a given dataset and is a simple wrapper around [TensorFlow.js' method](https://js.tensorflow.org/api/latest/#tf.LayersModel.fitDataset). The `Trainer` class is abstract, and requires a certain number of functions, so-called "callbacks", related to distributed learning to be implemented.

```js
abstract class Trainer {
    ...
    async fitModel (
        dataset: tf.data.Dataset<tf.TensorContainer>,
        valDataset: tf.data.Dataset<tf.TensorContainer>
      ): Promise<void> {
    
        await this.fitModelFunction(this.model,
          this.task.trainingInformation,
          dataset,
          valDataset,
          (e, l) => this.onEpochBegin(e, l),                 // <-- all the callbacks
          (e, l) => this.onEpochEnd(e, l),
          async (e, l) => await this.onBatchBegin(e, l),
          async (e, l) => await this.onBatchEnd(e, l),
          async (l) => await this.onTrainBegin(l),
          async (l) => await this.onTrainEnd(l))
      }
    
    protected async onBatchEnd (_: number, logs?: tf.Logs): Promise<void> {
        this.roundTracker.updateBatch()                                         // <-- update the batch count
    
        if (this.roundTracker.roundHasEnded()) {
          await this.onRoundEnd(logs.acc)        // The round ends after a certain number of batches
        }
    }
    
    // An example of an abstract callback signature
    protected abstract onRoundEnd (accuracy: number): Promise<void>
    ...
}
```
Since `onBatchEnd` is called every time a batch ends during training, it is the perfect place to perform weight sharing, pushing local weights and pulling the new aggregated weights. In order to only share weights every x number of batches (what we call "rounds", explained below), we use a `roundTracker` to keep track of when rounds end. 

The `DistributedTrainer` and `LocalTrainer` classes inheriting from `Trainer` implement the actual callbacks and what happens when a round ends. The `LocalTrainer` is class dedicated to training a model on a single node, i.e., centralized training. As such, the `LocalTrainer` simply updates its local model weights at the end of each round. In comparison, `DistributedTrainer` sends an update containing its local weights, and then pulls the new weights resulting from the aggregation of other updates.

### Rounds

A round is measured in batches, so if we say, "share weights every round" and the `roundDuration` is 5, this means that weights are shared every
5 batches. The user keeps track of **two** types of rounds: one is local to the trainer, the `roundTracker`,
and is simply used by the client training loop to know when to call `onRoundEnd`. 

The other round can be found in the `FederatedClient`, called the `serverRound`, and is incremented by the server after every model udpate, when weights are aggregated. 
When a client retrieves a model from the server, it also keeps track of the server round (this happens in the `FederatedClient`). You can think of the `serverRound` as a 
versioning number for the server model to make sure clients use the latest model weights.

Here's an example to better undertand how `serverRound` is used. Say we have user A, and a server S. Let us write inside parentheses the current
rounds, e.g., A(i) and S(k) denote that the `serverRound` of user A is `i` and the server round of the server is `k`. 

When A pulls a model from S(k), the client will update its own round A(k). After this, A starts to train, it pushes to the server every 
time a local round ends (the `roundTracker` helps keeping track of when a round ends); note that this does not influence A(k). 
Once a round ends, A pushes its weights to the server.

There are two cases to consider

1. Server is still at round `k`, the server model has not been updated in the meantime. Thus, the server stores the weights of A(k) in the server buffer for a later update.

2. Server is now at round `l`, s.t. `l > k`, meaning that the server has already aggregated weights into a new model while A was training. In this case, the server rejects A's weights,
A fetches the new model, and updates its round to A(j) to continue training with the new model.


## Disco

The Disco object composed of the `Trainer` and `Client` classes along with some other helper classes. Once it's built you can
start the magic by calling `disco.fit(data)`!

So what happens when we start training? Let us suppose we want to do federated training, this means that the `DistributedTrainer` and `FederatedClient`
will be in action. To start training the User (this could be the browser or cli for example) calls `disco.fit`, then in turn this will
call `disco.trainer.fitModel` and this will start the trainer state which will send weights to the client at each `onRoundEnd`.

```mermaid
flowchart LR
    User-->Disco-->|fit|Trainer-->|fitModel|state
    subgraph state [Trainer state]
    direction BT
    id1{{Training...}}-->|onRoundEnd|id2{{Push and fetch weights}}
    id2-->id1
    end
```

To recap our overview of the client, once onRoundEnd happens then we have the following sequence of calls with the client pushing weights to the server.


```mermaid
flowchart LR
    Client-.->|2. onRoundEndCommunication, post W<sub>R</sub>|S
    subgraph Disco
        Trainer-->|1. onRoundEnd|Client 
    end
    subgraph Server
        S[(Buffer)]
    end
```

Once the weights have been pushed, the client then proceeds to fetch the latest weights; it will only fetch new weights if these correspond to a new
round, something that the client also queries.

```mermaid
flowchart RL
    Client-.->|1. request weights|S
    S-.->|2. response W<sub>K</sub>|Client
    subgraph Disco
        Client ---> |3. onRoundEnd returns W<sub><sub>K</sub></sub>|Trainer
    end
    subgraph Server
        S[(Buffer)]
    end
```   

But when are new weights available to be fetched? To understand this we will finish this section with a brief detour of the server.

## Server

Federated learning in DISCO works asynchronously. The server has a buffer, which is a map from `userID` to `weights`. The buffer has a certain
`capacity`, once the size of buffer exceeds this `capacity`, then the server aggregates all the weights in the buffer and increments the round by 1.

```mermaid
flowchart LR
    Alice-.->|send W<sub>R</sub>|S
    Bob-.->|send W<sub>J</sub>|S
    Stephen-.->|send W<sub>S</sub>|S
    subgraph Users
        Alice
        Bob
        Stephen
    end
    subgraph Server
        S[(Buffer)]---I{{if buffer.size > capacity}}-->L(aggregate buffer)
    end
```

## Appendix

### Memory

If you look at the `DistributedTrainer` you will see a `memory` object, the goal of this class is to abstract the mechanism to store
the trained model in the client. In the browser we use IndexedDB, and in the benchmark we simply have an empty function since we are only
interested in performance metrics.

### Training informant

The `TrainingInformant` is observing the state of the trainer (e.g. accuracy, current round, ...), this is used in the browser to display
training information.

### Developing

Both the server and browser use hot-reloading, this means that they are both *watching* the files for changes,
and so whenever you change a server .ts file, then the server will reload (ditto for the browser).

However at the time of writing there is no such mechanism (this could be a fun first contribution!) for discojs.
If you noticed in the quick start before building the library we do `rm -rf dist`, we remove the `dist/` directory
which is where discojs is transpiled to (this contains JS code); so if we re-build discojs this acts as cache which
may sadly on some edge cases prevent new code from being built, so to be sure, it is recommended to remove this
cache before building.

### Debugging 

The easiest way to see what is going on is by using `console.log`, often times we want to see what value is inside 
a variable to make sure what is going on, e.g. `console.log('uniName:', uniName)`, however there is a nice shortcut
that is good to know: `console.log({uniName})`, by adding curly brackets we put uniName in an object which when printed
will give the name and contents (e.g. epfl) of the variable: `{uniName: epfl}`. 

