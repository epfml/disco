import type { DataType, Model, Task } from "../index.js";

export interface TaskProvider<D extends DataType> {
  getTask(): Task<D>;
  // Create the corresponding model ready for training (compiled)
  getModel(): Promise<Model<D>>;
}
