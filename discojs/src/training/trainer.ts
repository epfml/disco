import type tf from "@tensorflow/tfjs";
import { List } from "immutable";

import type { BatchLogs, EpochLogs, Memory, Model, Task } from "../index.js";
import { Client } from "../client/index.js";
import * as async_iterator from "../utils/async_iterator.js";

export interface RoundLogs {
  epochs: List<EpochLogs>;
}

/** Train a model and exchange with others */
export class Trainer {
  readonly #roundDuration: number;
  readonly #epochs: number;

  // small helper to avoid keeping Task & Memory around
  readonly #updateWorkingModel: () => Promise<void>;

  private training?: AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  >;

  /**
   * @param client how to communicate with others, undefined if local-only training
   */
  constructor(
    task: Task,
    memory: Memory,
    public readonly model: Model,
    private readonly client?: Client,
  ) {
    this.#roundDuration = task.trainingInformation.roundDuration;
    this.#epochs = task.trainingInformation.epochs;

    this.#updateWorkingModel = () =>
      memory.updateWorkingModel(
        {
          type: "working",
          taskID: task.id,
          name: task.trainingInformation.modelID,
          tensorBackend: task.trainingInformation.tensorBackend,
        },
        this.model,
      );

    if (!Number.isInteger(this.#epochs / this.#roundDuration))
      throw new Error(
        `round duration ${this.#roundDuration} doesn't divide number of epochs ${this.#epochs}`,
      );

    this.client?.aggregator?.setModel(model)
  }

  /**
   * Request stop training to be used from the Disco instance or any class that is taking care of the trainer.
   */
  async stopTraining(): Promise<void> {
    await this.training?.return();
  }

  /**
   * Start training the model with the given dataset
   * @param dataset
   */
  async *fitModel(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    if (this.training !== undefined)
      throw new Error(
        "training already running, cancel it before launching a new one",
      );

    try {
      this.training = this.#runRounds(dataset, valDataset);
      yield* this.training;
    } finally {
      this.training = undefined;
    }
  }

  async *#runRounds(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    const totalRound = Math.trunc(this.#epochs / this.#roundDuration);
    for (let round = 0; round < totalRound; round++) {
      await this.client?.onRoundBeginCommunication(this.model.weights, round);

      yield this.#runRound(dataset, valDataset);

      await this.client?.onRoundEndCommunication(this.model.weights, round);
      const weights = this.client?.aggregator?.model?.weights;
      if (weights !== undefined) this.model.weights = weights;

      await this.#updateWorkingModel();
    }
  }

  async *#runRound(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();
    for (let epoch = 0; epoch < this.#roundDuration; epoch++) {
      const [gen, epochLogs] = async_iterator.split(
        this.model.train(dataset, valDataset),
      );

      yield gen;
      epochsLogs = epochsLogs.push(await epochLogs);
    }

    return { epochs: epochsLogs };
  }
}
