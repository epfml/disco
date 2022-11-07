import { isDisplayInformation, DisplayInformation } from './display_information'
import { isTrainingInformation, TrainingInformation } from './training_information'
import { isDigest, Digest } from './digest'

export type TaskID = string

export function isTaskID (obj: unknown): obj is TaskID {
  return typeof obj === 'string'
}

export function isTask (raw: unknown): raw is Task {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  const { taskID, digest, displayInformation, trainingInformation } = raw as
    Record<'taskID' | 'digest' | 'displayInformation' | 'trainingInformation', unknown | undefined>

  if (typeof taskID !== 'string') {
    return false
  }
  if (digest !== undefined && !isDigest(digest)) {
    return false
  }
  if (!isDisplayInformation(displayInformation)) {
    return false
  }
  if (!isTrainingInformation(trainingInformation)) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: Task = { taskID, displayInformation, trainingInformation }

  return true
}

export interface Task {
  // TODO rename to ID
  taskID: TaskID
  digest?: Digest
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation
}
