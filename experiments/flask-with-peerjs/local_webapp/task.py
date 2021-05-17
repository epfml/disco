import torch
import time

def generate_data():
    from random import uniform
    from math import pi
    N = 100
    x = torch.Tensor([uniform(0, 1) for _ in range(N)])
    y = torch.Tensor([uniform(0, 1) for _ in range(N)])

    classes = ((x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.5 / pi).long()
    one_hot_classes = torch.zeros(classes.shape[0], 2).scatter_(1, classes.view(-1,1), 1.0)
    return torch.stack([x, y]).T, one_hot_classes


class Producer:

    def __init__(self):
        self.model = torch.nn.Sequential(
            torch.nn.Linear(2, 100),
            torch.nn.Linear(100, 100),
            torch.nn.Linear(100, 2)
        )
        self.time = time.time()

    def _train(self):
        n_epochs = 50
        points, labels = generate_data()
        criterion = torch.nn.MSELoss()
        optimizer = torch.optim.SGD(self.model.parameters(), 1e-3)
        for e in range(n_epochs):
            pred = self.model(points)
            loss = criterion(pred, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            self.update_timestamp()

            time.sleep(5) # pretend slow training

    def train(self):
        import threading
        t = threading.Thread(None, self._train)
        t.start()
#        t.join()

    def update_timestamp(self):
        self.time = time.time()

    def get_info(self):
        return {
            "time" : self.time,
            "param" : [p.data.tolist() for p in self.model.parameters()]
        }
