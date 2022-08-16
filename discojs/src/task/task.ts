import { isDisplayInformation, DisplayInformation } from './display_information'
import { TrainingInformation } from './training_information'
import * as tf from '@tensorflow/tfjs'

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
  const _: Task = { taskID, displayInformation }

  return true
}

export type PreProcessImage = (tensor: tf.Tensor3D) => tf.Tensor3D

export interface Task {
  // TODO rename to ID
  taskID: TaskID
  displayInformation?: DisplayInformation
  trainingInformation?: TrainingInformation
  preProcessImage?: PreProcessImage
}
