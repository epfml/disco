import numpy as np
import sys
sys.path.append('..')
from utils import model_init, optimizer_init, client_update, diffuse_params, average_models, evaluate, create_mixing_matrix

def run_topos(train_loader, test_loader, num_rounds, epochs, num_clients,
        topos, shuffle='random', net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithm for the given learning rate for
    a number of rounds, over some network. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        topos (array): list of possible network topologies
        shuffle (string): defines how topology evolves over time, randomly by default
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lr (double): the learning rate for the optimizaion algorithm

    Returns:
        global_model (nn.Module): the final global neural network averaging all the clients
        client_models (array of Net): the list of all the final client neural networks
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    assert shuffle in ['random', 'modulo', 'fraction']

    accs = []
    global_model, client_models = model_init(num_clients, net)
    opt = optimizer_init(client_models, lr, optimizer)

    loss, test_loss, acc = 0.0, 0.0, 0.0
    for r in range(num_rounds):
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)

        if shuffle == 'fraction':
            t = int(r * 5 / num_rounds)
            comm_matrix = create_mixing_matrix(topos[t], num_clients)
        elif shuffle == 'modulo':
            t = r%5
            comm_matrix = create_mixing_matrix(topos[t], num_clients)
        else: # shuffle == 'random'
            t = np.random.choice(range(5))
            comm_matrix = create_mixing_matrix(topos[t], num_clients)

        diffuse_params(client_models, comm_matrix)
        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round, %s topology' % (r, topos[t]))
        print('average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs
