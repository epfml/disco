import type tf from "@tensorflow/tfjs";
import { List } from "immutable";

import type { BatchLogs, EpochLogs, Model, Task } from "../index.js";
import { Client } from "../client/index.js";
import * as async_iterator from "../utils/async_iterator.js";

export interface RoundLogs {
  epochs: List<EpochLogs>;
  participants: number;
}

/** Train a model and exchange with others **/
export class Trainer {
  readonly #client: Client;
  readonly #roundDuration: number;
  readonly #epochs: number;

  #training?: AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  >;

  constructor(
    task: Task,
    public readonly model: Model,
    client: Client,
  ) {
    this.#client = client;
    this.#roundDuration = task.trainingInformation.roundDuration;
    this.#epochs = task.trainingInformation.epochs;

    if (!Number.isInteger(this.#epochs / this.#roundDuration))
      throw new Error(
        `round duration ${this.#roundDuration} doesn't divide number of epochs ${this.#epochs}`,
      );
  }

  async stopTraining(): Promise<void> {
    await this.#training?.return();
  }

  async *train(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    if (this.#training !== undefined)
      throw new Error(
        "training already running, stop it before launching a new one",
      );

    try {
      this.#training = this.#runRounds(dataset, valDataset);
      yield* this.#training;
    } finally {
      this.#training = undefined;
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
      await this.#client.onRoundBeginCommunication(this.model.weights, round);

      yield this.#runRound(dataset, valDataset);

      const weights = await this.#client.onRoundEndCommunication(this.model.weights, round);
      if (weights !== undefined) this.model.weights = weights;
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

    return {
      epochs: epochsLogs,
      participants: this.#client.nbOfParticipants,
    };
  }
}
