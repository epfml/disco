import type { DataType, Network, Task, ModelCard } from "../index.js";

export interface TaskProvider<D extends DataType, N extends Network> {
  getTask(): Promise<Task<D, N>>;
  // Create the corresponding model ready for training (compiled)
  modelCard: ModelCard<D>;
}
