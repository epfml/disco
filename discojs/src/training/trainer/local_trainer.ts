import type { Memory, Model, Task } from "../../index.js";

import { Trainer } from "./trainer.js";

/** Class whose role is to locally (alone) train a model on a given dataset,
 * without any collaborators.
 */
export class LocalTrainer extends Trainer {
  constructor(
    private readonly task: Task,
    private readonly memory: Memory,
    model: Model,
  ) {
    super(task, model);
  }

  override async onRoundBegin(): Promise<void> {
    return await Promise.resolve();
  }

  override async onRoundEnd(): Promise<void> {
    await this.memory.updateWorkingModel({
      type: 'working',
      taskID: this.task.id,
      name: this.task.trainingInformation.modelID,
      tensorBackend: this.task.trainingInformation.tensorBackend
    }, this.model);
  }
}
