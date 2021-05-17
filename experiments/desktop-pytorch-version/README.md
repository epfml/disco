## Introduction

This repository is a **decentralized machine learning** prototype built in Python. In short, the peers in a P2P network do ML training locally, communicate the trained model with other peers, and average the received models to the local model after each epoch. Besides, we use a simple server for signaling purposes. In this project, we focus on the practical aspects and try to build a prototype that works on the real network stack rather than doing a simulation. In this version, the ML training part is implemented in PyTorch, and the messaging part is implemented in ZeroMQ(PyZMQ).

Data privacy is crucial in machine learning. Decentralized machine learning is a new ML setting similar to federated learning, which uses local private data to do collaborative training on a public model. But in decentralized ML, we avoid using a central coordinator server for model updates. Model updates are shared among peers directly to achieve stronger privacy-preserving properties. Local training also avoids the need for large storage and high computing power on the server in the traditional ML setting.

Besides further data privacy, the communication network topology can be an arbitrary graph in decentralized ML, rather than the star graph as in federated learning. In this prototype design, the network topology is a complete graph, where all peers are pairwise connected and no peer has a centralized status. However, it also leads to a higher communication cost. And there is a need to deal with time-varying network topology because peers can join and leave at any time.

## Model and data

The handwritten digits dataset MNIST is used for training the CNN model, with 60,000 images for training and 10,000 images for testing. If the data is not downloaded yet, it will be automatically downloaded to the corresponding folder when running the program. After each epoch, we would do two ML tests on the model, one before averaging models and one after averaging models, to see if the model performs better on the testing set after averaging and how much it improves. 

We decided to split the dataset equally and assign a fraction of data to each of the peers for testing the prototype. Thus, you need to specify the total number of peers when running the client code to split the dataset and get a fraction of data for training. 

In the reality, the data doesn't have to be i.i.d. like the one we use in testing, but it can be heterogeneous, and each peer would only use their local private data. If you would like to use your own local private data, you can change the `data.py` file, then the numbers of peers are not needed when running the clients. If you would like to change the ML model, you can change the `network_model.py` file.

There is no limitation for the PyTorch model we use. The model is not different from any other PyTorch programs for traditional ML. So in general we can train any PyTorch model on top of this implementation, with GPU access to accelerate the training process as in normal PyTorch programs. If the model parameters have a large size, then it would take a longer time for the model communication over the P2P network, but there is no limitation for the maximum size of models to be sent.

## Requirements

Before running the program, make sure that the required libraries are installed.

```Bash
pip install torch torchvision pyzmq
```

## Usage

For a simple local test on the current prototype: if we would like to test n(=3) peers locally with localhost IP address,

1. Run the server with a defined port number.
```Bash
python ./server/server.py --port 5555
```

2. Run the clients with a number ID (0 to n-1) and the total number (n) of peers, as well as the client's address and server's address, in n different terminals:
```Bash
python ./client/client.py --num 0 --total 3 --client 127.0.0.1:6000 --server 127.0.0.1:5555
python ./client/client.py --num 1 --total 3 --client 127.0.0.1:6001 --server 127.0.0.1:5555
python ./client/client.py --num 2 --total 3 --client 127.0.0.1:6002 --server 127.0.0.1:5555
```

(Note that the ID and the total number are only used to decide which part of the dataset would be assigned on the correspoding peer, and they are not needed if you would like to use local private data. Setting n = 3 would only result in assigning 1/3 of the whole dataset to each peer.)

Then the training and messaging should start, the program will print out the current status of the program. You can start a new peer anytime you want, in any order. And if you stop a peer, other peers are not affected.

Comment 1: If you want to use a smaller dataset to test faster, you can set a higher total number to get a smaller fraction of the complete data. And you can run any number of peers less than the defined total number, e.g. you can set the total number to 20 but only run 3 clients, so that each client would only do training on 60,000 / 20 = 3,000 images.

```Bash
python ./client/client.py --num 0 --total 20 --client 127.0.0.1:6000 --server 127.0.0.1:5555
python ./client/client.py --num 1 --total 20 --client 127.0.0.1:6001 --server 127.0.0.1:5555
python ./client/client.py --num 2 --total 20 --client 127.0.0.1:6002 --server 127.0.0.1:5555
```

Comment 2: If you want to deploy the software on several real desktop clients that are not in the same subnet, you need to change the IP addresses in the command line to public ones when running the program, so that the clients will be able to find each other and find the server. For example, for server running on `1.2.3.4:5555` and three clients with public IPs `2.2.2.2`, `3.3.3.3`, and `4.4.4.4`, we run these three command lines on the three different desktops with the client port number we would like to use:

```Bash
$client1  python ./client/client.py --num 0 --total 3 --client 2.2.2.2:6000 --server 1.2.3.4:5555 
$client2  python ./client/client.py --num 1 --total 3 --client 3.3.3.3:7000 --server 1.2.3.4:5555 
$client3  python ./client/client.py --num 2 --total 3 --client 4.4.4.4:8000 --server 1.2.3.4:5555 
```

## Current status

The current code is designed for testing locally or testing on clients with public IP addresses. If you want to communicate over the Internet, you need to have public IP addresses for every peer (NAT traversal is not implemented yet), and then specify the IP address when running the client code.

## Details in implementation

In PyTorch, `state_dict` is the dictionary we use to represent the current model parameters. Python's `pickle` utility is used for serializing the model to byte stream that could go through the network stack. (This is automatically implemented in PyZMQ's `send_pyobj` and `recv_pyobj`.)

ZeroMQ has socket-based APIs similar to TCP but transfer discrete messages, with various socket types and various messaging patterns. More details are shown in the [documentation](https://zguide.zeromq.org/) and [zguide](https://zguide.zeromq.org/). We used DEALER sockets for model communication.

We implement training and messaging in an asynchronous way: one process is `train_and_send` and the other process is `receive_model_messages`. We run the processes concurrently with `multiprocessing` and share the received models through a process-safe Queue. This is because if we use a synchronous setting, then after each epoch of training, we will wait for all the other peers’ messages, which is waste of time if a peer is slow at computing or has more data to train.

We are trying to avoid a centralized server working as a coordinator, but we use a simple server for signaling purposes, like a BitTorrent tracker which assists in the communication between peers. When a new peer joins, the new peer sends a request to the server and the server will record the new peer. Any peer can query the server about the existing peers.

NAT traversal is not yet implemented so peers behind NATs are hard to reach currently.

## Possible future work / new designs
- Find a good way to test the prototype to ensure the robustness and evaluate the performance. (e.g. How to test with more peers, how to test on multiple public IPs, how to test on real local private datasets, etc.) Maybe docker can be used for the testing deployment.
- Add NAT traversal functionality, possible solutions are STUN/TURN server or UPnP (not always working). Or evaluate how NAT traversal is done in other P2P networks like BitTorrent. (Could we combine the NAT traversal with the current ZeroMQ messaging part, or do we need some other library?)
- Find possible use cases for the project. (Currently, it can potentially be used for companies or hospitals which have public IPs.) Design frontend UI for the application.
- Add more functionalities to the server, for example, it can be a platform where you can see available jobs and download
model architectures, or it can be a monitoring platform where peers can report their performance.
- Mobile deployment could be hard. (Is it possible to deploy PyTorch and Python programs to mobile devices? Or combine PyTorch Mobile with other bindings of ZeroMQ?)
- Add authentication for security, or add differential privacy for further data privacy.
- Regarding the P2P network topology, what would be a better design compared to a fully-connected complete graph? How can we define the neighboring peers for a peer? And adding load balance is possible in the network.

## Current designs to be improved
- Currently, when a peer leaves, others are not affected by that. However, the server and the other peers will not be notified about this leaving. We could add some code to deal with peers leaving. (How do we detect peers leaving?)
- Currently, when a peer wants to send model updates out, it will first query the server for the existing peers. We could change this to be all peers receiving notification when a new peer joins (or leaves), so that we don't need to do queries and establish new connections frequently.
- Currently, when a new peer joins, it starts with a plain model, so when it is averaged to other models, it would decrease the performance of others. We could add some bootstrapping code to initialize the new peer's model as the average of all the other trained models. It's also possible to design a weighted average and assign a weight to each model, so that well-trained models will have a higher weight in the averaging.


