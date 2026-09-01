import type { DataType, Network } from "#types/index";
import type { ModelCard } from "#models/index";
import type { Task } from "#task/task";

export interface TaskProvider<D extends DataType, N extends Network> {
  getTask(): Promise<Task<D, N>>;
  // Create the corresponding model ready for training (compiled)
  modelCard: ModelCard<D>;
}
