import { Federated } from './federated'
import { SecAgg } from './decentralized/sec_agg'
import { ClearText } from './decentralized/clear_text'
import { Local } from './local'
import { TrainingSchemes } from '../training/training_schemes'
import { Task } from '../task/task'
import { Base } from './base'

export function getClient (serverUrl: URL, task: Task): Base {
  if (task.trainingInformation !== undefined) {
    switch (task.trainingInformation.schemeInformation.scheme) {
      case TrainingSchemes.DECENTRALIZED:
        if (task.trainingInformation.schemeInformation.decentralizedSecure) {
          return new SecAgg(serverUrl, task.taskID, task.trainingInformation.schemeInformation, task.trainingInformation?.differentialPrivacy)
        } else {
          return new ClearText(serverUrl, task.taskID, task.trainingInformation.schemeInformation, task.trainingInformation.differentialPrivacy)
        }
      case TrainingSchemes.FEDERATED:
        return new Federated(serverUrl, task.taskID, task.trainingInformation.differentialPrivacy)
      case TrainingSchemes.LOCAL:
        return new Local(serverUrl, task.taskID)
    }
  } else {
    return new Local(serverUrl, task.taskID)
  }
}
