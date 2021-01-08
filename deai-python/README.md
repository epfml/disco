## Introduction

This is a decentralized machine learning prototype built in Python. The peers do ML training locally and communicate the models among other peers, averaging the models after each epoch. The model updates don't go through a coordinator server. There is a server only for tracking purpose, i.e. record all the peers' information so that a new peer knows about the existing peers.

The ML training part is implemented in PyTorch, and the messaging part is implemented in ZeroMQ(PyZMQ).

## Current status

The current code is designed for testing locally. If you want to communicate over the Internet, you need to have public IP addresses for every peer (NAT Traversal is not implemented yet), and specify the IP address in the client code.

The MNIST dataset is used for training the CNN model, so you need to spcify the total number of peers when running the client code to split the dataset and get a fraction of data for training. In the future if you would like to use your own data, then the numbers are not needed.

## Requirements

Make sure that the required libraries are installed:
```Bash
pip install torch torchvision pyzmq
```

## Usage

For example, if we would like to test three peers locally with localhost IP address,

1. Run the server with a defined port number:

```Bash
python ./server/server.py --port 5555
```

2. Run the clients with a number ID and the total number of peers, as well as the client's address and server's address, in three different terminals:

```Bash
python ./client/client.py --num 0 --total 3 --client 127.0.0.1:6000 --server 127.0.0.1:5555
python ./client/client.py --num 1 --total 3 --client 127.0.0.1:6001 --server 127.0.0.1:5555
python ./client/client.py --num 2 --total 3 --client 127.0.0.1:6002 --server 127.0.0.1:5555
```

Then the training and messaging should start. 

Comment: If you want to train on a smaller dataset to test faster, you can set a higher total number, and you can run any number of peers less than the defind total number, e.g.
```Bash
python ./client/client.py --num 0 --total 20 --client 127.0.0.1:6000 --server 127.0.0.1:5555
python ./client/client.py --num 1 --total 20 --client 127.0.0.1:6001 --server 127.0.0.1:5555
python ./client/client.py --num 2 --total 20 --client 127.0.0.1:6002 --server 127.0.0.1:5555
python ./client/client.py --num 3 --total 20 --client 127.0.0.1:6003 --server 127.0.0.1:5555
```
You can start a new peer anytime you want. If you stop a peer, other peers are not affected.

## Future steps
- Need to do further testing to ensure the robustness and evaluate the performance.
- Add STUN/TURN server functionality to do NAT traversal.
- ...