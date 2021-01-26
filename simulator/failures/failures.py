import numpy as np
import sys
sys.path.append('..')
from utils import model_init, optimizer_init, client_update, diffuse_params, average_models, evaluate

def run_failures_no_recovery(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
         failure_round, num_failures, corr='global', net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for
    a number of rounds, over some network. At some point of the execution, a number
    of links will fail, with no recovery. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        comm_matrix (numpy.array): the communication matric modeling the network
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        failure_round (int): the round at which links are going to fail
        num_failures (int): the number of link failures which will occur
        corr (string): the correction policy, global by default
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    failure_rounds = range(failure_round, num_rounds, 1)
    return run_failures(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
             failure_rounds, num_failures, corr, net, optimizer, lr)

def run_failures(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
         failure_rounds, num_failures, corr='global', net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for a number
    of rounds, over some network. A number of links will fail at some chosen rounds,
    but the network will recover them. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        comm_matrix (numpy.array): the communication matric modeling the network
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        failure_rounds (array): the list of rounds where links will fail
        num_failures (int): the number of link failures which will occur
        corr (string): the correction policy, global by default
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    assert corr in ['global', 'local', 'none']

    accs = []
    global_model, client_models = model_init(num_clients, net)
    opt = optimizer_init(client_models, lr, optimizer)

    if corr == 'global':
        comm_matrix_f = network_failures_global(comm_matrix, num_failures)
    elif corr == 'local':
        comm_matrix_f = network_failures_local(comm_matrix, num_failures)
    else: # corr = 'none'
        comm_matrix_f = network_failures_no_correction(comm_matrix, num_failures)

    loss, test_loss, acc = 0.0, 0.0, 0.0
    for r in range(num_rounds):
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)

        if r in failure_rounds:
            print("failure round")
            diffuse_params(client_models, comm_matrix_f)
        else:
            print("normal round")
            diffuse_params(client_models, comm_matrix)
        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round' % r)
        print('average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs

def network_failures_global(W, num_failures):
    """
    Introduces failures in the network. To maintain the communication matrix,
    upon a failure of edge {i, j} the rows i and j of W are globally re-weighted,
    i.e. on each row each nonzero value stays the same.

    Params:
        W (numpy.array): the communication matrix
        num_failures (int): the number of failures to be introduced on the network

    Returns:
        W (numpy.array): the updated communication matrix
    """
    num_nodes = W.shape[0]
    for k in range(num_failures):
        i, j = 0, 0
        while(i == j):
            i = np.random.choice(num_nodes)
            j = np.random.choice(num_nodes, p=W[i])
        W[i, j] = 0.
        W[j, i] = 0.
        m = np.nonzero(W[i])[0].shape[0]
        W[i] = (m+1) * W[i] / m
        n = np.nonzero(W[j])[0].shape[0]
        W[j] = (n+1) * W[j] / n
    return W

def network_failures_local(W, num_failures):
    """
    Introduces failures in the network. To maintain the communication matrix,
    upon a failure of edge {i, j} the rows i and j of W are locally re-weighted,
    i.e. in row i W(i, i) becomes W(i, i) + W(i, j), W(i, j) is set to zero and
    the other values are not modified.

    Params:
        W (numpy.array): the communication matrix
        num_failures (int): the number of failures to be introduced on the network

    Returns:
        W (numpy.array): the updated communication matrix
    """
    num_nodes = W.shape[0]
    for k in range(num_failures):
        i, j = 0, 0
        while(i == j):
            i = np.random.choice(num_nodes)
            j = np.random.choice(num_nodes, p=W[i])
        W[i, i] += W[i, j]
        W[j, j] += W[j, i]
        W[i, j] = 0.
        W[j, i] = 0.
    return W

def network_failures_no_correction(W, num_failures):
    """
    Introduces failures in the network. No maintenance of the matrix is performed.

    Params:
        W (numpy.array): the communication matrix
        num_failures (int): the number of failures to be introduced on the network

    Returns:
        W (numpy.array): the updated communication matrix
    """
    num_nodes = W.shape[0]
    for k in range(num_failures):
        i, j = 0, 0
        while(i == j):
            i = np.random.choice(num_nodes)
            j = np.random.choice(np.nonzero(W[i])[0])
        W[i, j] = 0.
        W[j, i] = 0.
    return W
