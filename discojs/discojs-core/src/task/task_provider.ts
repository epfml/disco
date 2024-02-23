import type tf from '@tensorflow/tfjs'

import type { Task } from '..'

export interface TaskProvider {
  getTask: () => Task
  // Create the corresponding model ready for training (compiled)
  getModel: () => Promise<tf.LayersModel>
}

export function isTaskProvider (obj: any): obj is TaskProvider {
  if ('getModel' in obj && typeof obj.getModel === 'function' &&
  'getTask' in obj && typeof obj.getTask === 'function') {
    return true
  } else {
    return false
  }
}
