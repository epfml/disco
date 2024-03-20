import type { Model, Task } from '..'

export interface TaskProvider {
  getTask: () => Task
  // Create the corresponding model ready for training (compiled)
  getModel: () => Promise<Model>
}
