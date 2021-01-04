import data
import network_model
import testing

import argparse
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import datasets, transforms
from torch.optim.lr_scheduler import StepLR
from multiprocessing import Queue, Process
import queue
import json
import pickle
import zmq


def train_epoch(args, model, device, train_loader, optimizer, epoch):
    model.train()
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = F.nll_loss(output, target)
        loss.backward()
        optimizer.step()
        if batch_idx % args.log_interval == 0:
            print('Train Epoch: {} [{}/{} ({:.0f}%)]\tLoss: {:.6f}'.format(
                epoch, batch_idx * len(data), len(train_loader.dataset),
                100. * batch_idx / len(train_loader), loss.item()))
            if args.dry_run:
                break


def average_with_models(model, received_states):
    total_num = len(received_states) + 1
    model_state = model.state_dict()
    for key in model_state:
        model_state[key] = (model_state[key] + sum([state[key]
                                                    for state in received_states])) / total_num
    model.load_state_dict(model_state)


def send_model_messages(send_socket, model):
    model_message = pickle.dumps(model.state_dict())
    send_socket.send(model_message)
    print("Sent a message")


def print_async(print_queue):
    while True:
        print_msg = print_queue.get()
        print(print_msg)


def receive_model_messages(addr_message, model_queue, print_queue):
    # Initialize the socket for receiving messages.
    context = zmq.Context()
    recv_socket = context.socket(zmq.PULL)
    recv_socket.bind(addr_message)
    print_queue.put("Binding on socket " + addr_message)
    while True:
        model_message = recv_socket.recv()
        received_state = pickle.loads(model_message)
        model_queue.put(received_state)
        print_queue.put("Received a message")


def train_and_send(args, model, device, train_loader, optimizer, model_queue, print_queue, peer_list):
    # Initialize the socket for sending messages.
    context = zmq.Context()
    send_socket = context.socket(zmq.PUSH)
    for peer_addr in peer_list:
        send_socket.connect(peer_addr)
        print_queue.put("Connected to peer " + peer_addr)

    for epoch in range(1, args.epochs + 1):
        train_epoch(args, model, device, train_loader, optimizer, epoch)
        send_model_messages(send_socket, model)

        print_queue.put("----------- Epoch " + str(epoch) +
                        " finished ----------- ")

        received_states = []
        if model_queue.empty():
            print_queue.put('Received message queue is empty. ' +
                            'If this is not the first epoch, you should receive messages when there are other peers running.')
        else:
            try:
                while True:
                    received_states.append(model_queue.get_nowait())
            except queue.Empty:
                print_queue.put(
                    "Averaging with " + str(len(received_states)) + " models received...")

        if received_states:
            average_with_models(model, received_states)
            print_queue.put("Averaging models ended.")

        # testing.test(model, device, test_loader)


def main():
    # Step 1:
    # Parse command line arguments about server address, local port number, peer number, etc.

    parser = argparse.ArgumentParser(description='DeAI peer client')
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
    # The number is used to decide which part of the original dataset is trained on this peer.
    parser.add_argument('--num', type=int, default=0, metavar='N',
                        help='Number of this peer')
    parser.add_argument('--total', type=int, default=1, metavar='N',
                        help='Total number of peers')
    parser.add_argument('--client', default='127.0.0.1:6000', metavar='N',
                        help='The client address (default: 127.0.0.1:6000)')
    parser.add_argument('--server', default='127.0.0.1:5555', metavar='N',
                        help='The server address (default: 127.0.0.1:5555)')

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
    addr_message = 'tcp://' + args.client
    port = args.client.split(':')[-1]
    print("Starting the program on", addr_message)

    # Step 2:
    # Initialize the network model and dataset.
    print("Initializing the network model and dataset...")
    model = network_model.Net().to(device)
    optimizer = optim.SGD(model.parameters(), lr=args.lr)

    train_set, test_set = data.load_data(args.num, args.total)
    train_loader = torch.utils.data.DataLoader(train_set, **train_kwargs)
    test_loader = torch.utils.data.DataLoader(test_set, **test_kwargs)

    # Step 3:
    # Connect to server and get all peers' information.
    print("Connecting to server tcp://" + args.server)
    context = zmq.Context()
    socket = context.socket(zmq.REQ)
    socket.connect('tcp://' + args.server)

    socket.send(addr_message.encode('utf-8'))
    peer_list_message = socket.recv().decode('utf-8')
    print("Received reply, existing peers:", peer_list_message)
    socket.close()

    peer_list = json.loads(peer_list_message)

    # Step 4:
    # Run the training process and message-receiving process at the same time.
    # Use a queue to store received model messages.
    print("----------- Training and messaging started ----------- ")
    model_queue = Queue()
    print_queue = Queue()
    p1 = Process(target=train_and_send, args=(args, model, device, train_loader,
                                              optimizer, model_queue, print_queue, peer_list))
    p2 = Process(target=receive_model_messages, args=(
        addr_message, model_queue, print_queue))
    p3 = Process(target=print_async, args=(print_queue, ))
    p1.start()
    p1.join()
    p2.start()
    p2.join()
    p3.start()
    p3.join()


if __name__ == '__main__':
    main()
