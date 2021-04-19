# Failures

## Description

This package allows you to try different ways of simulating failures over the network. A network failure happens when a communication cannot be transmitted between two neighbouring nodes. You may recover from a failure, i.e. it only lasts for one or a few rounds, or not.

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
  - the number of epochs, i.e. the number of steps taken by each client model between each parameter diffusion
  - the batch size, i.e. the number of samples taken by the optimization algorithm at a time
  - the number of link failures in the network
  - the failure rounds, either defined by one value in case there is no recovery, or by a list of values in case of recovery

### Communication matrix

Then, you need to build the communication matrix, which simulates the links between the clients. In particular, you need to provide the topology you want to give to your network.

```
comm_matrix = create_mixing_matrix('grid', num_clients)
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

If you want to run your algorithm on a network with link failures but without recovery, you may instead call

```
global_model, client_models, accs = run_failures_no_recovery(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients, failure_round, num_failures, corr='global', net='net', optimizer='sgd', lr=0.1)
```

The `corr` parameter defines the correction policy upon notice of a failure. It may be either:
  - *none*: If an edge {i, j} fails, we simply set the corresponding values in the communication matrix W to 0. This should not be used because it breaks the sum up to 1 property.
  - *local*: Upon failure of one its links, a node replaces the missing weights by its own. This results in a simple addition in W. For instance, if the failing edge is {i, j}, then in row i, W{i, i} becomes W{i, i} + W{i, j} and W{i, j} is set to 0. Row j is adjusted the same way.
  - *global*: : When performing global correction, all the weights are slightly adjusted for all neighbours of i and j. For instance, if node i has 5 neighbours, it used to have all nonzero weights set to 0.2. After the failure and the global correction, the 4 remaining neighbours would now have a weight W{i, k} = 0.25.

Alternatively, if you want to run your algorithm on a network with link failures, with recovery, you may call

```
global_model, client_models, accs = run_failures(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients, failure_rounds, num_failures, corr='global', net='net', optimizer='sgd', lr=0.1)
```

### Measuring the goodness of your algorithm

The `train loss`, `test loss` and `test accuracy` are printed after each round. The test accuracies are kept in a list `accs` so you can plot the evolution of the test accuracy throughout the rounds.
Moreover, the global and client models are returned by the run function to allow you to measure consensus between the clients.

```
cons = consensus(global_model, client_models)
```
