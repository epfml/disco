import { DataType } from '../types.js'
import { isDisplayInformation, type DisplayInformation } from './display_information.js'
import { isTrainingInformation, type TrainingInformation } from './training_information.js'

export type TaskID = string

export interface Task<D extends DataType = DataType> {
  id: TaskID
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation<D>
}

export function isTaskID (obj: unknown): obj is TaskID {
  return typeof obj === 'string'
}

export function isTask (raw: unknown): raw is Task {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { id, displayInformation, trainingInformation }:
    Partial<Record<keyof Task, unknown>> = raw

  if (!isTaskID(id) ||
      !isDisplayInformation(displayInformation) ||
      !isTrainingInformation(trainingInformation)
  ) {
    return false
  }

  const repack = { id, displayInformation, trainingInformation }
  const _correct: Task = repack
  const _total: Record<keyof Task, unknown> = repack

  return true
}
