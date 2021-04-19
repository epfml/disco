import numpy as np
import torch
import sys
sys.path.append('..')
from utils import model_init, optimizer_init, client_update, diffuse_params, average_models, evaluate, create_mixing_matrix

def run_latency(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
        latency_nodes, net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for a
    number of rounds, over some network. Some nodes send their weights with a one-rounds
    latency, for the entire execution. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        comm_matrix (numpy.array): the communication matric modeling the network
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        latency_nodes (array): the list of delayed nodes
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    accs = []
    global_model, client_models = model_init(num_clients, net)
    opt = optimizer_init(client_models, lr, optimizer)

    loss, test_loss, acc = 0.0, 0.0, 0.0
    for r in range(num_rounds):
        old_client_models = client_models

        # client update
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)

        # diffuse params
        diffuse_params_latency(client_models, comm_matrix, latency_nodes)
        if (r > 0):
            diffuse_params_latency(old_client_models, comm_matrix, np.setdiff1d(np.array(range(num_clients)), latency_nodes))

        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round' % r)
        print('average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs

def run_latency_changing_topo(train_loader, test_loader, num_rounds, epochs, num_clients,
        latency_nodes, net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for a
    number of rounds, over some network. Some nodes send their weights with a one-rounds
    latency, for the entire execution. The network topology evolves over time. Outputs
    the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        comm_matrix (numpy.array): the communication matric modeling the network
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        latency_nodes (array): the list of delayed nodes
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    accs = []
    global_model, client_models = model_init(num_clients, net)
    opt = optimizer_init(client_models, lr, optimizer)
    topos = ['centralized', 'ring', 'grid']
    topo = np.random.choice(topos)
    comm_matrix = create_mixing_matrix(topo, num_clients)

    loss, test_loss, acc = 0.0, 0.0, 0.0
    for r in range(num_rounds):
        old_client_models = client_models
        old_topo = topo
        old_comm_matrix = comm_matrix
        topo = np.random.choice(topos)

        # client update
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)

        # diffuse params
        diffuse_params_latency(client_models, comm_matrix, latency_nodes)
        if (r > 0):
            diffuse_params_latency(old_client_models, old_comm_matrix, np.setdiff1d(np.array(range(num_clients)), latency_nodes))
        print("old topo: {}, new topo: {}".format(old_topo, topo))

        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round' % r)
        print('average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs

def run_latency_per_round(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
        latency_nodes, latency_rounds, net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for a
    number of rounds, over some network. Some nodes send their weights with a one-rounds
    latency, only during specific rounds. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        comm_matrix (numpy.array): the communication matric modeling the network
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        latency_nodes (array): the list of delayed nodes
        latency_rounds (array): the rounds at which latency will occur across the network
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    accs = []
    global_model, client_models = model_init(num_clients, net)
    opt = optimizer_init(client_models, lr, optimizer)

    loss, test_loss, acc = 0.0, 0.0, 0.0
    for r in range(num_rounds):
        old_client_models = client_models

        # client update
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)

        # diffuse params
        if (r in latency_rounds):
            diffuse_params_latency(client_models, comm_matrix, latency_nodes)
            print("round {}, delay".format(r))
        elif (r in latency_rounds + 1):
            diffuse_params(client_models, comm_matrix)
            diffuse_params_latency(old_client_models, comm_matrix, np.setdiff1d(np.array(range(num_clients)), latency_nodes))
            print("round {}, delay recovery".format(r))
        else:
            diffuse_params(client_models, comm_matrix)
            print("round {}, normal".format(r))

        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round' % r)
        print('average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs


def run_latency_per_round_changing_topo(train_loader, test_loader, num_rounds, epochs, num_clients,
        latency_nodes, latency_rounds, net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for a
    number of rounds, over some network. Some nodes send their weights with a one-rounds
    latency, only during specific rounds. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        latency_nodes (array): the list of delayed nodes
        latency_rounds (array): the rounds at which latency will occur across the network
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    accs = []
    global_model, client_models = model_init(num_clients, net)
    opt = optimizer_init(client_models, lr, optimizer)
    topos = ['centralized', 'ring', 'grid']
    topo = np.random.choice(topos)
    comm_matrix = create_mixing_matrix(topo, num_clients)

    loss, test_loss, acc = 0.0, 0.0, 0.0
    for r in range(num_rounds):
        old_client_models = client_models
        old_topo = topo
        old_comm_matrix = comm_matrix
        topo = np.random.choice(topos)

        # client update
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)

        # diffuse params
        if (r in latency_rounds):
            diffuse_params_latency(client_models, comm_matrix, latency_nodes)
            print("round {}, delay".format(r))
        elif (r in latency_rounds + 1):
            diffuse_params(client_models, comm_matrix)
            diffuse_params_latency(old_client_models, old_comm_matrix, np.setdiff1d(np.array(range(num_clients)), latency_nodes))
            print("round {}, delay recovery".format(r))
        else:
            diffuse_params(client_models, comm_matrix)
            print("round {}, normal".format(r))
        print("old topo: {}, new topo: {}".format(old_topo, topo))

        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round' % r)
        print('average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs

def diffuse_params_latency(client_models, communication_matrix, latency_nodes):
    """
    Diffuses the client models to their neighbours except if the node has latency.
    Such a node doesn't diffuse its weights now.

    Params:
        client_models (array): the list of all the client neural networks
        communication_matrix (numpy.array): the weighted matrix defining the links between clients
        latency_nodes (array): the list of nodes with latency
    """
    if client_models:
      client_state_dicts = [model.state_dict() for model in client_models]
      keys = client_state_dicts[0].keys()
    for model, weights in zip(client_models, communication_matrix):
        neighbors = np.nonzero(weights)[0]
        working_neigh = np.setdiff1d(neighbors, latency_nodes)
        if len(working_neigh) != 0:
          model.load_state_dict(
              {
                  key: torch.stack(
                      [weights[j]*client_state_dicts[j][key] for j in working_neigh],
                      dim=0,
                  ).sum(0) / weights.sum()
                  for key in keys
              }
          )

def nodes_latency(num_nodes, num_delay):
  """
  Chooses a number of nodes among the set of clients. The chosen ones now
  have latency, i.e. their weights are transmitted with some delay.

  Params:
      num_nodes (int): the number of clients
      num_delay (int): the number of latency nodes to choose

  Returns:
      lat_nodes (array): the list of latency nodes
  """
  assert num_delay < num_nodes
  lat_nodes = []
  for i in range(num_delay):
      k = np.random.choice(num_nodes)
      while (k in lat_nodes):
          k = np.random.choice(num_nodes)
      lat_nodes.append(k)
  return lat_nodes
