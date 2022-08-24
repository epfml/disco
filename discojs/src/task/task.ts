import { isDisplayInformation, DisplayInformation } from './display_information'
import { TrainingInformation, ClientInformation, DataInformation } from './training_information'

export type TaskID = string

export function isTaskID (obj: unknown): obj is TaskID {
  return typeof obj === 'string'
}

// TODO: CAN DELETE?
export function isTask (raw: unknown): raw is Task {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  if (!('taskID' in raw)) {
    return false
  }
  const { taskID, displayInformation } = raw as Record<'taskID' | 'displayInformation', unknown | undefined>

  if (typeof taskID !== 'string') {
    return false
  }
  if (displayInformation !== undefined &&
    !isDisplayInformation(displayInformation)) {
    return false
  }

  // TODO check for TrainingInformation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _: Task = { taskID, displayInformation }

  return true
}

export interface Task {
  // TODO rename to ID
  taskID: TaskID
  displayInformation: DisplayInformation
  trainingInformation: TrainingInformation
  clientInformation: ClientInformation
  dataInformation: DataInformation
}
