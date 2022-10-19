# On boarding

So you want to contribute to disco? If yes then this guide is for you.

Disco has grown a lot since its early days, and like with any sizeable code base, getting started is both
difficult and intimidating: There are a *lot* of files, it's not clear what's important at first, and even where to start 
is a bit of a puzzle.

The two main technologies behind Disco are TypeScript and Distributed Learning, I will assume that the reader is familiar 
with both to some extent, if not the following references might be useful. 

> Even if you are already familiar with TypeScript or Federated Learning it's always good to go over the relevant knowledge to discover pieces you might have missed the first time; the devil is in the details, and it is the details that maketh the expert.

- [JavaScript](https://eloquentjavascript.net)
- [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Deep learning](https://www.youtube.com/watch?v=dQw4w9WgXcQ?autoplay=1)

Before we start I want to preface by saying that, by the time you read this the structure of disco will have changed (perhaps 
as you are reading these words a PR is being merged into the develop branch). I will
try to use specific examples but at the same time be general enough with the hope that this will still be useful. If you
find that certain parts are indeed outdated, then it is *your* responsibility now to update this document in order to keep the fire
going. Good luck, and may node be with you.

> Disco is a big project so some things have been omitted, you are encouraged to add missing information!

## First steps

When learning a new programming language the established first step is *hello world*, which in short is a sanity check to
make sure things are running. In Disco this is a bit more involved since it is composed of a library (discojs), a front-end (browser),
a back-end (server) and a cli (benchmark); depending on what your goal is, you might only use a subset of them, e.g. for running 
simulations with the cli you don't need the browser.

To quickly get up and running you can follow any of the following quick start guide; note that each folder has it's README.md with useful information that might be useful
if you can't get it to run.

> The most common issues with running disco are usually due to using old node versions and setting the appropriate environment on M1 Macs, see [here](./FAQ.md) for more. Note that disco has been not tested on Windows (only Linux and macOS).

### Quick-start - Web client

- install Node.js 16 and ensure it is activated on opening any new terminal (with NVM: `cd discoj && nvm use` or `nvm use 16`)
- `git clone git@github.com:epfml/disco.git` (clone this repository)
- `cd discojs-core && npm ci && rm -rf dist && npm run build` 
- `cd discojs && npm ci && rm -rf dist && npm run build` 
- `cd server && npm ci && npm run dev`, check that the server is indeed running on localhost:8080
- `cd browser && npm ci && npm run dev`, check that the browser client is running on localhost:8081

> If you run the server first then you will get an error since the server is expected to run on localhost:8080

More information about the browser can be found [here](../browser/README.md)

### Quick-start - CLI

- install Node.js 16 and ensure it is activated on opening a new terminal (using NVM: `cd disco && nvm use` or `nvm use 16`)
- `git clone git@github.com:epfml/disco.git` (clone this repository)
- `cd discojs-core && npm ci && rm -rf dist && npm run build` 
- `cd discojs-node && npm ci && rm -rf dist && npm run build`
- `cd server && npm ci`
- `cd benchmark && npm ci && npm run benchmark`

More information about the cli can be found [here](../benchmark/README.md)

### Quick-start - basic example

A bare bones example of disco can be found [here](./../server/example/) with both code and documentation.

## Under the hood

In this section we will go over how the core logic is structured.

     .
     ├── README.md    # Home page
     ├── DEV.md       # Developer guide
     ├── LICENSE      
     ├── information  # Markdown documentation of the project lives here (except [README](../README.md) and [DEV](../DEV.md))
     │  └── ... 
     ├── discojs-core # Core module: tasks, model training, model validation and communication across devices
     │  ├── src       
     │  ├── ...       
     │  └── README.md
     ├── discojs      # Browser module: data handling 
     │  ├── src       
     │  ├── ...       
     │  └── README.md
     ├── discojs-node # Node module: data handling
     │  ├── src       
     │  ├── ...       
     │  └── README.md 
     ├── server       # Helper server for orchestration (and aggregation in federated learning)
     │  ├── src       
     │  ├── ...       
     │  └── README.md 
     ├── browser      # Browser-based client and UI built with Vue.js
     │  ├── src       
     │  ├── ...       
     │  └── README.md 
     ├── benchmark    # A command line interface (CLI) and Node-based client for Disco. No browser needed. Can serve as a simulator or for integration to other usecases
     │  ├── src       
     │  ├── ...       
     │  └── README.md 
     └── ...

The server, browser and benchmark each contain all the relevant code and README.md about their respective roles which are
self-explanatory in their name.

The main core logic of disco is in `discojs`. In turn, the main object of Discojs is the Disco class, which groups together the different classes that enable distributed learning;
these classes are the `Trainer` and the `Client`, the latter deals with communication and the former with training. Since different
types of communication and training is available these classes are abstract and various implementations exist for the different frameworks (e.g. `FederatedClient`
for federated communication with a central server).

Once you understand how these two classes work (as well as it's concrete implementations) you will have a good initial grasp of Disco. The rest of the classes mostly 
deal with building these objects (the [Task](./TASK.md) object specifies all this information), making them work together and so on.

> In what follows, most code snippets will be incomplete with respect to the actual code in order to focus on the essentials.

### Trainer

The trainer class contains all code relevant for training, its main method is `trainModel` which does as it would 
suggest, train a model with a given dataset. This class is abstract, and requires the method `onRoundEnd`
to be implemented which is the where the distributed learning flow starts.

```js
async trainModel (dataset: tf.data.Dataset<tf.TensorContainer>): Promise<void> {

    // Assign callbacks and start training
    await this.model.fitDataset(dataset, {
      callbacks: {
        onBatchEnd: async (epoch, logs) => await this.onBatchEnd(epoch, logs) // <-- call our own onBatchEnd
      }
    })
}

protected async onBatchEnd (_: number, logs?: tf.Logs): Promise<void> {
      this.roundTracker.updateBatch()                                         // <-- update round

    if (this.roundTracker.roundHasEnded()) {
      await this.onRoundEnd(logs.acc)                                         // <-- call onRoundEnd
    }
  }

protected abstract onRoundEnd (accuracy: number): Promise<void>
```

Note that `onBatchEnd` will be called by the TFJS's model callback, since this method is called every time a batch ends during
training it is the perfect place for weight sharing. In order to only share weights every x number of batches (i.e. every round),
we use a `roundTracker` to keep track of the of when a new round ends.

> See the appendix for more on rounds.

The distributed trainer class extends the trainer `onRoundEnd` as follows

```js
async onRoundEnd (accuracy: number): Promise<void> {

    // Post current weights and get back latest weights
    const aggregatedWeights = await this.client.onRoundEndCommunication(
      currentRoundWeights,
      this.roundTracker.round
    )

    // Update latest weights
    this.model.setWeights(aggregatedWeights)
  }
```

> How would you implement the local trainer? You can find the code for the `LocalTrainer.ts` to see if you are correct!

In `onRoundEnd` we the `client` which is the class that takes care of communication.

### Client

The client is structured similarly to the trainer, here too we have an abstract class that requires the method `onRoundEndCommunication`
to be implemented; the two implementations for it are the FederatedClient and the DecentralizedClient, we will explain how the 
FederatedClient works as it is easier to follow.

In the Federated client we first push our weights to the server, we then query for new aggregated weights, and return them if they exist;
if there are no new weights we simply return the current model.

> In the actual implementation we need to keep track of both the current and previous weight as we provide Differential Privacy.

```js
async onRoundEndCommunication (
    weights: Weights,
  ): Promise<Weights> {
    await this.postWeightsToServer(weights)                     // <--- 1. Post weights to server

    const serverWeights = await this.pullRoundAndFetchWeights() // <--- 2. Fetch new server (aggregated) weights, is undefined if none exist
    return serverWeights ?? weights                             
}
```

### Disco

The Disco object is an amalgam of the classes that we just saw along with some other less important helper classes. Once it's built you can
start the magic by calling `disco.startTraining(data)`!

So what happens when we start training? Let us suppose we want to do federated training, this means that the `DistributedTrainer` and `FederatedClient`
will be in action. To start training the User (this could be the browser or cli for example) calls `disco.startTraining`, then in turn this will
call `disco.trainer.trainModel` and this will start the trainer state which will send weights to the client at each `onRoundEnd`.

```mermaid
flowchart LR
    User-->Disco-->|startTraining|Trainer-->|trainModel|state
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

#### Server

Federated learning, at the time of writing works asynchronously; the server has a buffer, which is a map from `userID` to `weights`. The buffer has a certain
*capacity*, once the size of buffer exceeds this *capacity*, then the server aggregates all the weights in the buffer and increments the round by 1.

> When a user pushes a new weight this is only included in the map if the corresponding round is new enough, and if he had already pushed a weight before, than the weight is updated.

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

### Rounds

A round is measured in batches, so if we say, "share weights every round" and the roundDuration is 5, this means that every
5 batches weights are shared. The user keeps track of **two** types of rounds, one is local to the trainer, this is the `roundTracker`
and is simply used to know when to call `onRoundEnd`; the other round can be found in the `FederatedClient`, this round corresponds 
to the **server round** of the model last fetched from the server.

The server keeps track of it's own round, and it is incremented every time weights are aggregated. When a client gets a model from
the server, it also keeps track of the server round (this happens in the `FederatedClient`. So in some sense, this round value is a 
versioning number for the server model.

To make this a bit more clear let us follow and example, say we have user A, and a Server. Let us denote inside the parenthesis the current
round of the entity, e.g. A(i), Server(k), means the current round of user A is i and server is k. 

When A pulls a model from Server(k), then the client will update its own round A(k). After this, A starts to train, it pushes to the server every 
time a local round ends (the `roundTracker` helps keeping track of when a round ends); note that this does not influence A(k). 
Once a round ends A pushes his weights to the server.

There are two cases to consider

1. Server(k), the server model still has not been updated, this means we accept the weights of A(k) to the server buffer.

2. Server(j), s.t. j > k, this means that the server has aggregated a new model while A was training, in this case we reject A's model, then
A will fetch the new model, and update his round to A(j) and continue training with the new model.

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

