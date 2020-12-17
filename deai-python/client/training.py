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


def train(args, model, device, train_loader, optimizer, epoch):
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


def average_with_model(model, received_state):
    model_state = model.state_dict()
    for key in model_state:
        model_state[key] = (model_state[key] + received_state[key]) / 2
    model.load_state_dict(model_state)


def average_with_models(model, received_states):
    total_num = len(received_states) + 1
    model_state = model.state_dict()
    for key in model_state:
        model_state[key] = (model_state[key] + sum([state[key]
                                                    for state in received_states])) / total_num
    model.load_state_dict(model_state)
