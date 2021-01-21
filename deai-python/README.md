## Introduction

This is a decentralized machine learning prototype built in Python. The peers do deep learning training locally, and communicate the models among other peers, averaging the models after each epoch. Receiving the models is asynchronous, so you don't need to wait for other peers' messages before going to the next epoch. 

The model updates don't go through a coordinator server, so the training is decentralized. There is a server only for tracking purpose, i.e. record all the peers' information so that a new peer knows about the existing peers. In the future the server would also be useful for peers behind NATs to communicate with each other.

The ML training part is implemented in PyTorch, and the messaging part is implemented in ZeroMQ(PyZMQ).

## Current status

The current code is designed for testing locally or testing on clients with public IP addresses. If you want to communicate over the Internet, you need to have public IP addresses for every peer (NAT traversal is not implemented yet), and then specify the IP address when running the client code.

## Model and data

The handwritten digits dataset MNIST is used for training the CNN model, with 60,000 images for training and 10,000 images for testing. If the data is not downloaded yet, it will be automatically downloaded to the corresponding folder when running the program. After each epoch, we would do two tests on the model, one before averaging models and one after averaging models, to see if the model performs better on the testing set after averaging and how much it improves. 

We decided to split the dataset equally and assign a fraction of data to each of the peers for testing. Thus, you need to specify the total number of peers when running the client code to split the dataset and get a fraction of data for training. 

In the reality, the data doesn't have to be i.i.d. like the one we use in testing, but it can be heterogeneous, and each peer would only use their local private data. If you would like to use your own data, you can change the `data.py` file, then the numbers of peers are not needed when running the clients. If you would like to change the deep learning model, you can change the `network_model.py` file.

There is no limitation for the PyTorch model we use. The model is not different from any other PyTorch programs for traditional machine learning. So in general we can train any PyTorch model on top of this implementation, with GPU access to accelerate the training process as in normal PyTorch programs. If the model parameters have a large size, then it would take a longer time for the model communication over the P2P network, but there is no limitation for the maximum size of  models to be sent.

## Requirements

Before running the program, make sure that the required libraries are installed.

```Bash
pip install torch torchvision pyzmq
```

## Usage

For example, if we would like to test n(=3) peers locally with localhost IP address,

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
Then the training and messaging should start. You can start a new peer anytime you want, in any order. And if you stop a peer, other peers are not affected.

Comment 1: If you want to train on a smaller dataset to test faster, you can set a higher total number to get a smaller fraction of the complete data. And you can run any number of peers less than the defined total number, e.g. you can set the total number to 20 but only run 3 clients, so that each client would only do training on 3,000 images.

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


## Possible future work
- Need to do further testing to ensure the robustness and evaluate the performance.
- Add STUN/TURN server functionality to do NAT traversal.
- Frontend UI
- Mobile Deployment
- Security
- ...