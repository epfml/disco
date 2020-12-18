# Latency

## Description

This package allows you to simulate latency over the network. There is latency on the network when one or several clients communicate their weights to their neighbours with a delay, thus breaking the synchronization of the network, especially if these messages end up being delivered after the next communication has arrived.

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
  - the list of nodes with latency, which can be selected by calling `nodes_latency(num_nodes, num_delay)`, with `num_nodes` the number of clients, and `num_delay` the number of latency nodes you want in your network
  - the list of rounds where these nodes will have latency, if you don't choose to maintain latency for the entire run

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

If you want to run your algorithm on a network where some nodes communicate with a one-round delay for the entire run, you may instead call

```
global_model, client_models, accs = run_latency(train_loader, test_loader, num_rounds, epochs, num_clients, latency_nodes, net='net', optimizer='sgd', lr=0.1)
```

If you want those delays to happen on a network with changing topology, call

```
global_model, client_models, accs = run_latency_changing_topo(train_loader, test_loader, num_rounds, epochs, num_clients, latency_nodes, net='net', optimizer='sgd', lr=0.1)
```

Finally, if you want the delays to only happen during one or a few specific rounds, you may call

```
global_model, client_models, accs = run_latency_per_round(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients, latency_nodes, latency_rounds, net='net', optimizer='sgd', lr=0.1)
```

or, alternatively, if you still want to make the topology evolve

```
global_model, client_models, accs = run_latency_per_round_changing_topo(train_loader, test_loader, num_rounds, epochs, num_clients, latency_nodes, latency_rounds, net='net', optimizer='sgd', lr=0.1)
```

### Measuring the goodness of your algorithm

The `train loss`, `test loss` and `test accuracy` are printed after each round. The test accuracies are kept in a list `accs` so you can plot the evolution of the test accuracy throughout the rounds.
Moreover, the global and client models are returned by the run function to allow you to measure consensus between the clients.

```
cons = consensus(global_model, client_models)
```
