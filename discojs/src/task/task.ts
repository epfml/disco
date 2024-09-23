import { DataType } from '../types.js'
import { isDisplayInformation, type DisplayInformation } from './display_information.js'
import { isTrainingInformation, type TrainingInformation } from './training_information.js'

export type TaskID = string

export interface Task<D extends DataType> {
  id: TaskID
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation<D>
}

export function isTaskID (obj: unknown): obj is TaskID {
  return typeof obj === 'string'
}

export function isTask (raw: unknown): raw is Task<DataType> {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { id, displayInformation, trainingInformation }:
    Partial<Record<keyof Task<DataType>, unknown>> = raw

  if (!isTaskID(id) ||
      !isDisplayInformation(displayInformation) ||
      !isTrainingInformation(trainingInformation)
  ) {
    return false
  }

  const _: Task<DataType> = {
    id,
    displayInformation,
    trainingInformation,
  } satisfies Record<keyof Task<DataType>, unknown>;

  return true
}
