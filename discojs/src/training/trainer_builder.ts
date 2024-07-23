import type {
  client as clients,
  Model,
  Task,
  ModelInfo,
  Memory,
} from "../index.js";

import { Trainer } from "./trainer.js";

/**
 * A class that helps build the Trainer and auxiliary classes.
 */
export class TrainerBuilder {
  constructor(
    private readonly memory: Memory,
    private readonly task: Task,
  ) {}

  /**
   * Builds a trainer object.
   *
   * @param client client to share weights with (either distributed or federated)
   * @param distributed whether to build a distributed or local trainer
   * @returns
   */
  async build(client: clients.Client, distributed = false): Promise<Trainer> {
    return new Trainer(
      this.task,
      this.memory,
      await this.getModel(client),
      distributed ? client : undefined,
    );
  }

  /**
   * If a model exists in memory, load it, otherwise load model from server
   * @returns
   */
  private async getModel(client: clients.Client): Promise<Model> {
    const modelID = this.task.trainingInformation?.modelID;
    if (modelID === undefined) {
      throw new TypeError("model ID is undefined");
    }

    const info: ModelInfo = {
      type: "working",
      taskID: this.task.id,
      name: modelID,
      tensorBackend: "gpt",
    };
    const model = await ((await this.memory.contains(info))
      ? this.memory.getModel(info)
      : client.getLatestModel());
    return model;
  }
}
