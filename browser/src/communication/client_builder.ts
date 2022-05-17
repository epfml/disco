import { Client, Task, TrainingSchemes, DecentralizedClient, FederatedClient, LocalClient } from 'discojs'

export function getClient (trainingScheme: TrainingSchemes, task: Task): Client {
  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      return new DecentralizedClient(
        new URL(process.env.VUE_APP_DEAI_SERVER, ''), task)
    case TrainingSchemes.FEDERATED:
      return new FederatedClient(
        new URL(process.env.VUE_APP_FEAI_SERVER, ''), task)
    case TrainingSchemes.LOCAL:
      return new LocalClient(task)
  }
}
