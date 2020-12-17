import data
import network_model
import training
import testing
import message

import argparse
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import datasets, transforms
from torch.optim.lr_scheduler import StepLR
import socket
import json
import time
import zmq


def main():
    # Step 1:
    # Parse command line arguments about server address, local port number, peer number, etc.

    parser = argparse.ArgumentParser(description='PyTorch MNIST Example')
    parser.add_argument('--batch-size', type=int, default=64, metavar='N',
                        help='input batch size for training (default: 64)')
    parser.add_argument('--test-batch-size', type=int, default=1000, metavar='N',
                        help='input batch size for testing (default: 1000)')
    parser.add_argument('--epochs', type=int, default=14, metavar='N',
                        help='number of epochs to train (default: 14)')
    parser.add_argument('--lr', type=float, default=1.0, metavar='LR',
                        help='learning rate (default: 1.0)')
    parser.add_argument('--gamma', type=float, default=0.7, metavar='M',
                        help='Learning rate step gamma (default: 0.7)')
    parser.add_argument('--no-cuda', action='store_true', default=False,
                        help='disables CUDA training')
    parser.add_argument('--dry-run', action='store_true', default=False,
                        help='quickly check a single pass')
    parser.add_argument('--seed', type=int, default=1, metavar='S',
                        help='random seed (default: 1)')
    parser.add_argument('--log-interval', type=int, default=10, metavar='N',
                        help='how many batches to wait before logging training status')
    parser.add_argument('--save-model', action='store_true', default=False,
                        help='For Saving the current Model')
    # The number is used to decide which part of the original dataset is trained on this peer
    parser.add_argument('--num', type=int, default=0, metavar='N',
                        help='Number of this peer')
    parser.add_argument('--total', type=int, default=1, metavar='N',
                        help='Total number of peers')

    args = parser.parse_args()
    use_cuda = not args.no_cuda and torch.cuda.is_available()
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if use_cuda else "cpu")
    train_kwargs = {'batch_size': args.batch_size}
    test_kwargs = {'batch_size': args.test_batch_size}
    if use_cuda:
        cuda_kwargs = {'num_workers': 1,
                       'pin_memory': True,
                       'shuffle': True}
        train_kwargs.update(cuda_kwargs)
        test_kwargs.update(cuda_kwargs)

    # Step 2:
    # Initialize the network model and dataset.

    model = network_model.Net().to(device)
    optimizer = optim.SGD(model.parameters(), lr=args.lr)
    # scheduler = StepLR(optimizer, step_size=1, gamma=args.gamma)

    train_set, test_set = data.load_data(args.num, args.total)
    train_loader = torch.utils.data.DataLoader(train_set, **train_kwargs)
    test_loader = torch.utils.data.DataLoader(test_set, **test_kwargs)

    # Step 3:
    # Connect to server and get all peers' information, connect to peers.

    # Step 4:
    # Run training and messaging functions

    for epoch in range(1, args.epochs + 1):
        training.train(args, model, device, train_loader, optimizer, epoch)
        # testing.test(model, device, test_loader)
        message.send_model_state(tcp_socket, model)
        # scheduler.step()


'''
        while data = tcp_socket.recv(8192):
            total_data = [data]
            while data = tcp_socket.recv(8192):
                total_data.append(data)
            message = ''.join(total_data)
            received_state = json.loads(message.decode('utf-8'))
            average_model(model, received_state)
'''

if args.save_model:
    torch.save(model.state_dict(), "model.pt")


if __name__ == '__main__':
    main()
