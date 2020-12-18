# Topologies

## Description

This package allows you to try different network topologies and make your network change over time.
You can them determine how much this affect your decentralized algorithm.

## Setup

Install PyTorch and NetworkX if you don't have it already

```
pip install torch torchvision
pip install networkx
```

## How to use

### Hyper-parameters

First, you need to define your hyper-parameters:
  - the number of clients in the network
  - the number of rounds, i.e. the number of times the parameters are exchanged between neighbours
  - the number of epochs, i.e. the number of optimization iterations per round
  - the batch size, i.e. the number of samples taken by the optimization algorithm at a time

### Communication matrix

Then, you need to build the communication matrix, which simulates the links between the clients. In particular, you need to provide the topology you want to give to your network.

```
comm_matrix = create_mixing_matrix('centralized', num_clients)
```

### Load data

Now that you have your clients, you may load the dataset and split it between them. You can choose to distribute the samples identically and independently (IID) or not.

```
train_loader, test_loader = load_data(batch_size, num_clients, distribution='iid')
```

### Instantiate models and optimizers

The last things you need before execution is to initialize your models and your optimizers. You need one model per client and a global one averaging them all, and one optimizer per client.
You need to define which neural network you want as model. Two example models, `Net` and `Net2`, are provided.
You also to provide the optimizer you want as well as the learning rate for the chosen optimization algorithm. The optimizer is `SGD` by default, with learning rate `0.1`.

```
global_model, client_models = model_init(num_clients, net='net')
opt = optimizer_init(client_models, lr, optimizer='sgd')
```

Note that the learning rate can also be determined with a grid search (cf /grid_search folder).
Besides, the instantiation of the models and optimizers are included in the `run` function.

### Run decentralized training and testing

Finally, we can run our decentralized machine learning simulation.

```
global_model, client_models, accs = run(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients, net='net', optimizer='sgd', lr=0.1)
```

If you want to run your algorithm on a network with changing topology, you may instead call

```
global_model, client_models, accs = run_topos(train_loader, test_loader, num_rounds, epochs, num_clients, topos, shuffle='random', net='net', optimizer='sgd', lr=0.1)
```
The `topos` parameter is the list of possible network topologies.
The `shuffle` parameter defines how to select the network topology for the current round.
It may be either:
  - `random`: select the current topology totally at random, independently of the topology of the previous round(s)
  - `modulo`: select the current topology according to the order defined by the list of topologies. Starts from the head once it has reached the end of the list
  - `fraction`: with n topologies, select the first topology in the list for the first r=num_rounds/n rounds, the second topology for the next r ones...

### Measuring the goodness of your algorithm

The `train loss`, `test loss` and `test accuracy` are printed after each round. The test accuracies are kept in a list `accs` so you can plot the evolution of the test accuracy throughout the rounds.
Moreover, the global and client models are returned by the run function to allow you to measure consensus between the clients.

```
cons = consensus(global_model, client_models)
```
