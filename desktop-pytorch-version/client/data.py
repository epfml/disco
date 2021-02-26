import torch
from torchvision import datasets, transforms


# Load a fraction of dataset for training
def load_data(num, total):
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])

    train_set = datasets.MNIST('./data', train=True, download=True,
                               transform=transform)
    test_set = datasets.MNIST('./data', train=False,
                              transform=transform)

    # Use a subset of the whole training set
    indices = range(len(train_set) // total * num,
                    len(train_set) // total * (num + 1))
    train_set = torch.utils.data.Subset(train_set, indices)

    return train_set, test_set
