import { Base } from './base'
import { FederatedInformant } from './federated'
import { DecentralizedInformant } from './decentralized'
import { LocalInformant } from './local'
import { Task } from '../../task/task'
import { TrainingSchemes } from '../../training/training_schemes'

export function getInformant (task: Task, nbrMessagesToShow: number = 10): Base {
  switch (task.clientInformation.scheme) {
    case TrainingSchemes.DECENTRALIZED: {
      return new DecentralizedInformant(task.taskID, nbrMessagesToShow)
    }
    case TrainingSchemes.FEDERATED: {
      return new FederatedInformant(task.taskID, nbrMessagesToShow)
    }
    case TrainingSchemes.LOCAL: {
      return new LocalInformant(task.taskID, nbrMessagesToShow)
    }
  }
}
