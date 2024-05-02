import type { Model, Memory, Task, client as clients } from "../../index.js";
import type { Aggregator } from "../../aggregator/index.js";

import { Trainer } from "./trainer.js";

/**
 * Class whose role is to train a model in a distributed way with a given dataset.
 */
export class DistributedTrainer extends Trainer {
  private readonly aggregator: Aggregator;

  /**
   * DistributedTrainer constructor, accepts same arguments as Trainer and in additional also a client who takes care of communicating weights.
   */
  constructor(
    private readonly task: Task,
    private readonly memory: Memory,
    model: Model,
    private readonly client: clients.Client,
  ) {
    super(task, model);
    this.aggregator = this.client.aggregator;
    this.aggregator.setModel(model);
  }

  override async onRoundBegin(round: number): Promise<void> {
    await this.client.onRoundBeginCommunication(this.model.weights, round);
  }

  /**
   * Callback called every time a round is over
   */
  override async onRoundEnd(round: number): Promise<void> {
    await this.client.onRoundEndCommunication(this.model.weights, round);
    if (this.aggregator.model !== undefined) {
      // The aggregator's own aggregation is async. The trainer updates its model to match the aggregator's
      // after it has completed a round of training.
      this.model.weights = this.aggregator.model.weights;
    }

    await this.memory.updateWorkingModel(
      { taskID: this.task.id, name: this.task.trainingInformation.modelID },
      this.model,
    );
  }
}
