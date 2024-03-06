import { isDisplayInformation, type DisplayInformation } from './display_information.js'
import { DatasetConfigType, ModelConfigType, NetworkConfigType, isTrainingInformation, type TrainingInformation } from './training_information.js'
import { isDigest, type Digest } from './digest.js'

export type TaskID = string

export interface Task<
  D extends DatasetConfigType,
  M extends ModelConfigType,
  N extends NetworkConfigType,
>
{
  id: TaskID
  digest?: Digest
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation<D, M, N>
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
