import type { Model, Task } from '../index.js'

export interface TaskProvider {
  getTask: () => Task
  // Create the corresponding model ready for training (compiled)
  getModel: () => Promise<Model>
}
