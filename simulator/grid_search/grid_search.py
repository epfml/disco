from utils import *

def grid_search(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
                net='net', optimizer='sgd', lrs=np.logspace(-12, -1, 13, base=2.0)):
    """
    Runs a decentralized optimization algorithme for the given learning rates for
    a number of rounds, over some network. Outputs the accuracies and returns them.

    Params:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
        comm_matrix (numpy.array): the communication matric modeling the network
        num_rounds (int): the number of data exchanges between nodes
        epochs (int): the number of optimization steps between each communication (minimum 1)
        num_clients (int): the number of clients in the network
        net (string): the neural network framework we use
        optimizer (string): the chosen optimizer, SGD by default
        lrs (array): the list of stepsizes to test

    Returns:
        accs (array): the corresponding accuracies, with the same shape as lrs
    """
    accs = []
    for lr in lrs:
        global_model, client_models = model_init(num_clients, net)
        opt = optimizer_init(client_models, lr, optimizer)

        loss, test_loss, acc = 0.0, 0.0, 0.0
        for r in range(num_rounds):
            for i in range(num_clients):
                loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)
            diffuse_params(client_models, comm_matrix)
            average_models(global_model, client_models)
            test_loss, acc = evaluate(global_model, test_loader)

        print('lr %g | average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (lr, loss / num_clients, test_loss, acc))
        accs.append(acc)
    return accs
