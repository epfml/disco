import { isDisplayInformation, type DisplayInformation } from './display_information'
import { isTrainingInformation, type TrainingInformation } from './training_information'
import { isDigest, type Digest } from './digest'

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

  const { id, digest, displayInformation, trainingInformation } = raw as
    Record<'id' | 'digest' | 'displayInformation' | 'trainingInformation', unknown | undefined>

  if (!isTaskID(id)) {
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
  const _: Task = { id, displayInformation, trainingInformation }

  return true
}

export interface Task {
  id: TaskID
  digest?: Digest
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation
}
