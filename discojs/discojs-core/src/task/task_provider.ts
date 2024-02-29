import type { Model, Task } from '..'

export interface TaskProvider {
  getTask: () => Task
  // Create the corresponding model ready for training (compiled)
  getModel: () => Promise<Model>
}

export function isTaskProvider (obj: any): obj is TaskProvider {
  if ('getModel' in obj && typeof obj.getModel === 'function' &&
  'getTask' in obj && typeof obj.getTask === 'function') {
    return true
  } else {
    return false
  }
}
