# Trying a different decentralized algorithm: A-NC, a consensus algorithm with repeated averaging

## Description

This package allows you to try another decentralized algorithm, adapted from [A-NC](https://arxiv.org/pdf/0712.1609.pdf), which was defined for static consensus.
The algorithm is based on repeated averaging. The idea is to run an optimization algorithm for *i* rounds.
We then restart all over and run it again, and again for *p* runs. Finally, you compute the final consensus value averaging the final states of each run. It assumes a static network, independent Gaussian noise and a fixed global link weight *β*, which the fraction of the weights sent to the neighbours.
The convergence rate is fast thanks to the constant weights but bias-variance trade-off is present. With a constant number of iteration *ip*, decreasing *i* means lower variance and higher bias while increasing it means higher variance and lower bias.
The increased number of runs also makes it longer to execute. Finally, this algorithm requires greater coordination between nodes since a heavier computation is necessary.

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
  - the number of runs, i.e. the number of times you restart your optimization algorithm
  - the number of epochs, i.e. the number of steps taken by each client model between each parameter diffusion
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

This does one run of your algorithm. You may want to use a loop to simulate the *p* runs as done in the `simulator_A_NC.ipynb` file.

### Measuring the goodness of your algorithm

The `train loss`, `test loss` and `test accuracy` are printed after each round. The test accuracies are kept in a list `accs` so you can plot the evolution of the test accuracy throughout the rounds.
Moreover, the global and client models are returned by the run function to allow you to measure consensus between the clients.

```
cons = consensus(global_model, client_models)
```

You can measure consensus in a similar way once you have aggregated the models of each run into an average one.
