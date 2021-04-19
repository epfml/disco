import numpy as np
import networkx as nx
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import datasets, transforms
from tqdm import tqdm

class Net(nn.Module):
    """
    A class defining a neural network with three convolutional layers and
    two fully-connected layers. The activation function is ReLU except for
    the final layer, where it is log_softmax.
    The class inherits from the Module class of torch.nn.
    """

    def __init__(self):
        """
        Initializes the neural network.
        """
        super(Net, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1)
        self.fc1 = nn.Linear(2048, 128)
        self.fc2 = nn.Linear(128, 10)

    def forward(self, x):
        """
        Performs the forward pass of the neural network.

        Params:
            x (torch.Tensor): the input vector

        Returns:
            output (torch.Tensor): the output vector
        """
        x = self.conv1(x)
        x = F.relu(x)
        x = self.conv2(x)
        x = F.relu(x)
        x = self.conv3(x)
        x = F.relu(x)
        x = torch.flatten(x, 1)
        x = self.fc1(x)
        x = F.relu(x)
        x = self.fc2(x)
        output = F.log_softmax(x, dim=1)
        return output


class Net2(nn.Module):
    """
    A class defining a neural network with one convolutional layer and
    one fully-connected layer. The activation function is ReLU except for
    the final layer, where it is log_softmax.
    The class inherits from the Module class of torch.nn.
    """

    def __init__(self):
        """
        Initializes the neural network.
        """
        super(Net2, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1)
        self.fc1 = nn.Linear(6272, 10)

    def forward(self, x):
        """
        Performs the forward pass of the neural network.

        Params:
            x (torch.Tensor): the input vector

        Returns:
            output (torch.Tensor): the output vector
        """
        x = self.conv1(x)
        x = F.relu(x)
        x = torch.flatten(x, 1)
        x = self.fc1(x)
        output = F.log_softmax(x, dim=1)
        return output

def client_update(client_model, optimizer, train_loader, epoch=5):
    """
    Trains a client model on the training data using an optimizer for
    some number of epochs.

    Params:
        client_model (nn.Module): the given neural network
        optimizer (SGD): the given optimizer algorithm
        train_loader (DataLoader): the training dataset
        epoch (int): the number of times the optimizer is run on the entire dataset

    Returns:
        loss (float): the training loss of the model after the last iteration
    """
    client_model.train()
    for e in range(epoch):
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.cuda(), target.cuda()
            optimizer.zero_grad()
            output = client_model(data)
            loss = F.nll_loss(output, target)
            loss.backward()
            optimizer.step()
    return loss.item()

def diffuse_params(client_models, communication_matrix):
    """
    Diffuses the client models to their neighbours.

    Params:
        client_models (array): the list of all the client neural networks
        communication_matrix (numpy.array): the weighted matrix defining the links between clients
    """
    if client_models:
      client_state_dicts = [model.state_dict() for model in client_models]
      keys = client_state_dicts[0].keys()
    for model, weights in zip(client_models, communication_matrix):
        neighbors = np.nonzero(weights)[0]
        model.load_state_dict(
            {
                key: torch.stack(
                    [weights[j]*client_state_dicts[j][key] for j in neighbors],
                    dim=0,
                ).sum(0) / weights.sum()
                for key in keys
            }
        )

def average_models(global_model, client_models):
    """
    Averages models across all clients.

    Params:
        global_model (nn.Module): the global neural network averaging all the clients
        client_models (array of Net): the list of all the client neural networks
    """
    global_dict = global_model.state_dict()
    for k in global_dict.keys():
        global_dict[k] = torch.stack([client_models[i].state_dict()[k] for i in range(len(client_models))], 0).mean(0)
    global_model.load_state_dict(global_dict)

def evaluate(global_model, data_loader):
    """
    Computes loss and accuracy of a model on a test dataset.

    Params:
        global_model (nn.Module): the neural network the dataset is tested on
        data_loader (DataLoader): the given test dataset

    Returns:
        loss (double): the loss of the neural network
        acc (double): the accuracy of the neural network
    """
    global_model.eval()
    loss = 0
    correct = 0
    with torch.no_grad():
        for data, target in data_loader:
            data, target = data.cuda(), target.cuda()
            output = global_model(data)
            loss += F.nll_loss(output, target, reduction='sum').item()  # sum up batch loss
            pred = output.argmax(dim=1, keepdim=True)  # get the index of the max log-probability
            correct += pred.eq(target.view_as(pred)).sum().item()

    loss /= len(data_loader.dataset)
    acc = correct / len(data_loader.dataset)

    return loss, acc

def consensus(global_model, client_models):
    """
    Computes the consensus value of each client model by comparing it to the global
    one. We use Mean Square Error to measure the distance between two weight vectors
    and average the consensus values of each parameter vector.

    Params:
        global_model (nn.Module): the global neural network averaging all the clients
        client_models (array of Net): the list of all the client neural networks

    Returns:
        cons(array): the list of consensus values, one per client
    """
    global_dict_values = list(global_model.state_dict().values())
    n = len(global_dict_values)
    cons = []
    for client in client_models:
        k = 0
        client_dict_values = list(client.state_dict().values())
        dist = [torch.norm(client_dict_values[k] - global_dict_values[k]) ** 2 for k in range(n)]
        mean_dist = torch.mean(torch.Tensor(dist))
        cons.append(round(mean_dist.item(), 6))
    return cons

def load_data(batch_size, num_clients, distribution='iid'):
    """
    Loads data and spreads it across the clients.

    Params:
        distribution (string): how the data is distributed across clients, independently and identically by default
        batch_size (int): the chosen data batch size
        num_clients (int): the number of clients in the network to spread the data on

    Returns:
        train_loader (array): the list of all train datasets, one per client
        test_loader (array): the list of test datasets, one per client
    """
    assert distribution in ['iid', 'non-iid']

    if distribution == 'iid':
        traindata = datasets.MNIST('./data', train=True, download=True,
                       transform=transforms.Compose([transforms.ToTensor(),transforms.Normalize((0.1307,), (0.3081,))])
                       )
        traindata_split = torch.utils.data.random_split(traindata, [int(traindata.data.shape[0] / num_clients) for _ in range(num_clients)])
        train_loader = [torch.utils.data.DataLoader(x, batch_size=batch_size, shuffle=True) for x in traindata_split]

        test_loader = torch.utils.data.DataLoader(
                datasets.MNIST('./data', train=False, transform=transforms.Compose([transforms.ToTensor(),transforms.Normalize((0.1307,), (0.3081,))])
                ), batch_size=batch_size, shuffle=True)
    else: # distribution == 'non-iid'
        traindata = datasets.MNIST('./data', train=True, download=True,
                       transform=transforms.Compose([transforms.ToTensor(),transforms.Normalize((0.1307,), (0.3081,))])
                       )
        target_labels = torch.stack([traindata.targets == i for i in range(10)])
        target_labels_split = []
        for i in range(5):
            target_labels_split += torch.split(torch.where(target_labels[(2 * i):(2 * (i + 1))].sum(0))[0], int(60000 / num_clients))
        traindata_split = [torch.utils.data.Subset(traindata, tl) for tl in target_labels_split]
        train_loader = [torch.utils.data.DataLoader(x, batch_size=batch_size, shuffle=True) for x in traindata_split]

        test_loader = torch.utils.data.DataLoader(
                datasets.MNIST('./data', train=False, transform=transforms.Compose([transforms.ToTensor(),transforms.Normalize((0.1307,), (0.3081,))])
                ), batch_size=batch_size, shuffle=True)
    return train_loader, test_loader

def model_init(num_clients, net='net'):
    """
    Initializes the client neural networks based on a global one.

    Params:
        net (string): the neural network framework we use
        num_clients (int): the number of clients in the network

    Returns:
        global_model (nn.Module): the global neural network averaging all the clients'
        client_models (array): the list of all client neural networks
    """
    assert net in ['net', 'net2']

    if net == 'net2':
        if torch.cuda.is_available():
            global_model = Net2().cuda()
            client_models = [Net2().cuda() for _ in range(num_clients)]
        else:
            global_model = Net2()
            client_models = [Net2() for _ in range(num_clients)]
    else: # net = 'net'
        if torch.cuda.is_available():
            global_model = Net().cuda()
            client_models = [Net().cuda() for _ in range(num_clients)]
        else:
            global_model = Net()
            client_models = [Net() for _ in range(num_clients)]

    for model in client_models:
        model.load_state_dict(global_model.state_dict())
    return global_model, client_models

def optimizer_init(client_models, lr, optimizer='sgd'):
    """
    Initializes the optimizer for each client.

    Params:
        optimizer (string): the chosen optimizer, SGD by default
        client_models (array): the list of all client neural networks
        lr (int): the learning rate of each optimizer

    Returns:
        opt (array): the list of optimizers, one per client
    """
    assert optimizer in ['sgd']
    opt = None
    if (optimizer == 'sgd'):
        opt = [optim.SGD(model.parameters(), lr=lr) for model in client_models]
    return opt

def run(train_loader, test_loader, comm_matrix, num_rounds, epochs, num_clients,
        net='net', optimizer='sgd', lr=0.1):
    """
    Runs a decentralized optimization algorithme for the given learning rate for
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
        loss = 0
        for i in range(num_clients):
            loss += client_update(client_models[i], opt[i], train_loader[i], epoch=epochs)
        diffuse_params(client_models, comm_matrix)
        average_models(global_model, client_models)
        test_loss, acc = evaluate(global_model, test_loader)

        print('%d-th round' % r)
        print('lr %g | average train loss %0.3g | test loss %0.3g | test acc: %0.3f' % (lr, loss / num_clients, test_loss, acc))
        accs.append(acc)
    return global_model, client_models, accs

def create_mixing_matrix(topology, n_cores):
    """
    Builds the communication matrix according to a topology and a number of clients.

    Params:
        topology (string): the chosen topology, either ring, grid or centralized
        n_cores (int): the number of clients constituting the network

    Returns:
        W (numpy.array): the generated communication matrix
    """
    assert topology in ['ring', 'centralized', 'grid', 'disconnected', 'star', 'ladder']
    if topology == 'ring':
        W = np.zeros(shape=(n_cores, n_cores))
        value = 1./3 if n_cores >= 3 else 1./2
        np.fill_diagonal(W, value)
        np.fill_diagonal(W[1:], value, wrap=False)
        np.fill_diagonal(W[:, 1:], value, wrap=False)
        W[0, n_cores - 1] = value
        W[n_cores - 1, 0] = value
        return W
    elif topology == 'centralized':
        W = np.ones((n_cores, n_cores), dtype=np.float64) / n_cores
        return W
    elif topology == 'grid':
        #assert int(np.sqrt(n_cores)) ** 2 == n_cores # n_cores must be a square
        G = nx.generators.lattice.grid_2d_graph(int(np.sqrt(n_cores)), int(np.sqrt(n_cores)), periodic=True)
        W = nx.adjacency_matrix(G).toarray()
        for i in range(0, W.shape[0]):
            W[i][i] = 1
        W = W/5
        return W
    elif topology == 'star':
        G = nx.star_graph(n_cores - 1)
        W = nx.adjacency_matrix(G).toarray()
        for i in range(0, W.shape[0]):
            W[i][i] = 1
        W = W / 2
        W[0] = np.full((n_cores), 1./n_cores)
        # W[:1] = W[:1] / num_nodes
        return  W
    elif topology == 'ladder':
        assert int(n_cores /2) * 2 == n_cores # n_cores must be even
        G = nx.circular_ladder_graph(n_cores // 2)
        W = nx.adjacency_matrix(G).toarray()
        for i in range(0, W.shape[0]):
            W[i][i] = 1
        W = W / 4
        return W
    else: # topology == 'disconnected'
        W = np.zeros(shape=(n_cores, n_cores))
        np.fill_diagonal(W, 1, wrap=False)
        return W
