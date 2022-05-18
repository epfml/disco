import { client, Client, Task, TrainingSchemes } from 'discojs'

export function getClient (trainingScheme: TrainingSchemes, task: Task): Client {
  switch (trainingScheme) {
    case TrainingSchemes.DECENTRALIZED:
      return new client.Decentralized(
        new URL(process.env.VUE_APP_DEAI_SERVER, ''), task)
    case TrainingSchemes.FEDERATED:
      return new client.Federated(
        new URL(process.env.VUE_APP_FEAI_SERVER, ''), task)
    case TrainingSchemes.LOCAL:
      return new client.Local(task)
  }
}
