import { isDisplayInformation, type DisplayInformation } from './display_information'
import { isTrainingInformation, type TrainingInformation } from './training_information'
import { isDigest, type Digest } from './digest'

export type TaskID = string

export interface Task {
  id: TaskID
  digest?: Digest
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation
}

export function isTaskID (obj: unknown): obj is TaskID {
  return typeof obj === 'string'
}

export function isTask (raw: unknown): raw is Task {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { id, digest, displayInformation, trainingInformation }:
    Partial<Record<keyof Task, unknown>> = raw

  if (!isTaskID(id) ||
      (digest !== undefined && !isDigest(digest)) ||
      !isDisplayInformation(displayInformation) ||
      !isTrainingInformation(trainingInformation)
  ) {
    return false
  }

  const repack = { id, digest, displayInformation, trainingInformation }
  const _correct: Task = repack
  const _total: Record<keyof Task, unknown> = repack

  return true
}
