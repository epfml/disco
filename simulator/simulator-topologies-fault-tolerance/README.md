# Why this simulator?

Decentralized Machine Learning has been getting more and more attention lately, both for its efficient scaling to an important number of machines and for the solutions it offers in terms of data privacy. The [Disco](https://github.com/epfml/disco) project aims at building a generic infrastructure for executing algorithms on many machines concurrently.
Before a real-world implementation, simulations were required to gain insights about the consequences of different network aspects, such as the topology, the failures, the delays, the Byzantine agents... Besides, a well-designed simulator could constitute a nice standard benchmarking for testing decentralized algorithms before deploying them.

# Base features

## Neural network

You may want to run your optimization algorithm over a neural network. Two examples are given:
  - `Net`: a neural network with three convolutional layers and two fully-connected layers. The activation function is `ReLU` except for the final layer, where it is `log_softmax`.
  - `Net2`: a neural network with one convolutional layer and one fully-connected layer. The activation function is `ReLU` for the first layer and `log_softmax` for the final layer.

## Grid search

If you need to find an optimal learning rate for your optimization algorithm, you may want to try your model over a range of learning rates. This can be done easily by calling `grid_search(lrs)`, with lrs the list of learning rates you want to test. The function returns the list of corresponding accuracies, of equal size.

# The simulator

The simulator comes in different flavors, each one represented by one of the packages of this repository. Each package contains a `utils.py` file, common to all packages, another python file specific to each aspect and an executed test notebook.

## Topologies

We implemented four different network topologies:
  - *centralized*: each client is connected to every client
  - *grid*: each client is connected to exactly five neighbours, itself included
  - *ring*: each client is connected to exactly three neighbours, itself included
  - *circular ladder*: each client is connected to exactly four neighbours, itself included
  - *star*: each client is connected only to a central client
  - *disconnected*: this is an extreme case where there not a single link between any two clients. Thus nodes never communicate and need to converge by themselves
The ring and grid topologies should be privileged since the number of links remains linear with the number of clients.
To create a network of with `n_cores` clients interconnected according to a topology `topo`, you simply need to call `create_mixing_matrix(topology, n_cores)`. This function returns a weight matrix `W`, where W_{i, j} > 0 only if there is an edge between nodes i and j. In row i, all nonzero weights have the same value `β=1/d`, with d the degree of node i (i being a neighbour of itself). Indeed, we need rows to sum up to 1 to avoid making weights decay or grow exponentially with the communication.

## Failures

A network failure happens when a communication cannot be transmitted between two neighbouring nodes.

### Probabilistic models

A realistic way to represent random failures is to model them using an adequate probabilistic distribution.
You may choose between the three following distributions depending on your application:
  - *Exponential distribution*: can be used to model random failures, which are predominant in electronic devices. Its only parameter is the failure rate `λ`, or equivalently its inverse `γ = 1/λ`.
  - *Normal distribution*: can be used to model wear out failures. Its parameters are its mean `μ` and its standard deviation `σ`.
  - *Weibull distribution*: can be used either to model random or wear out failures. Its parameters a shape parameter `a` and a scale parameter `τ`. A small `a` (`0 < a < 1`) will model "infant mortality", i.e. a lot of failures happen at the beginning of the connection. When `a = 1` we simply have an exponential distribution with parameter `γ = τ`. Finally, when `a > 1`, we see the number of failures increase importantly after a time, similarly to the normal distribution.
You may call `probabilistic_model(distribution, n_cores, param)` to determine the failing round of any of the `n_cores` clients according to the given `distribution`. You will have to give additional parameters depending on the model.

### Network corrections

We tested three different ways of dealing with the failure once the neighbours have noticed it:
  - *no correction*: If an edge {i, j} fails, we simply set the corresponding values in the communication matrix W to 0. This should not be used because it breaks the sum up to 1 property. To use this correction, call `network_failures_no_correction(W, num_failures)`.
  - *local correction*: Upon failure of one its links, a node replaces the missing weights by its own. This results in a simple addition in W. For instance, if the failing edge is {i, j}, then in row i, W{i, i} becomes W{i, i} + W{i, j} and W{i, j} is set to 0. Row j is adjusted the same way. To use this correction, call `network_failures_local(W, num_failures)`.
  - *global correction*: : When performing global correction, all the weights are slightly adjusted for all neighbours of i and j. For instance, if node i has 5 neighbours, it used to have all nonzero weights set to 0.2. After the failure and the global correction, the 4 remaining neighbours would now have a weight W{i, k} = 0.25. To use this correction, call `network_failures_global(W, num_failures)`.

## Latency

There is latency on the network when one or several clients communicate their weights to their neighbours with a delay, thus breaking the synchronization of the network, especially if these messages end up being delivered after the next communication has arrived.
You may select a number of latency nodes among the clients by calling `nodes_latency(num_clients, num_delay)`.
Upon parameter diffusion, calling `diffuse_params_latency(client_models, communication_matrix, latency_nodes)` will diffuse only the parameters of the non-delayed nodes. For recovery, simply call the same function but instead of excluding the delayed nodes exclude the non-delayed ones.

## Alternative algorithms to Decentralized SGD

### A-NC

This first alternative is adapted from [A-NC](https://arxiv.org/pdf/0712.1609.pdf), which was defined for static consensus.
The algorithm is based on repeated averaging. The idea is to run an optimization algorithm for *i* rounds.
We then restart all over and run it again, and again for *p* runs. Finally, you compute the final consensus value averaging the final states of each run.
This allows to have a low bias and/or variance depending on how large *i* and *p* respectively are.

# Setup

Install PyTorch and NetworkX if you don't have it already

```
pip install torch torchvision
pip install networkx
```

# How to use

## Hyper-parameters

First, you need to define your hyper-parameters:
  - the number of clients in the network
  - the number of rounds, i.e. the number of times the parameters are exchanged between neighbours
  - the number of epochs, i.e. the number of optimization iterations per round
  - the batch size, i.e. the number of samples taken by the optimization algorithm at a time

## Communication matrix

Then, you need to build the communication matrix, which simulates the links between the clients. In particular, you need to provide the topology you want to give to your network.

```
comm_matrix = create_mixing_matrix('centralized', num_clients)
```

## Load data

Now that you have your clients, you may load the dataset and split it between them. You can choose to distribute the samples identically and independently (IID) or not.

```
train_loader, test_loader = load_data(batch_size, num_clients, distribution='iid')
```

IID data means the samples are split totally at random and each client should receive look-alike datasets in terms of class frequency. The non-IID case I briefly explored consists in feeding the clients only with data samples belonging to one pair of classes among {{0, 1}, {2, 3}, {4, 5}, {6, 7}, {8, 9}}.

## Instantiate models and optimizers

The last things you need before execution is to initialize your models and your optimizers. You need one model per client and a global one averaging them all, and one optimizer per client.
You need to define which neural network you want as model. Two example models, `Net` and `Net2`, are provided.
You also to provide the optimizer you want as well as the learning rate for the chosen optimization algorithm. The optimizer is `SGD` by default, with learning rate `0.1`.

```
global_model, client_models = model_init(num_clients, net='net')
opt = optimizer_init(client_models, lr, optimizer='sgd')
```

Note that the learning rate can also be determined with a grid search (cf /grid_search folder).
Besides, the instantiation of the models and optimizers are included in the `run` function.

## Run decentralized training and testing

Finally, we can run our decentralized machine learning simulation.

```
global_model, client_models, accs = run(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients, net='net', optimizer='sgd', lr=0.1)
```

## Measuring the goodness of your algorithm

The `train loss`, `test loss` and `test accuracy` are printed after each round. The test accuracies are kept in a list `accs` so you can plot the evolution of the test accuracy throughout the rounds.
Moreover, the global and client models are returned by the run function to allow you to measure consensus between the clients.

```
cons = consensus(global_model, client_models)
```
