import type tf from "@tensorflow/tfjs";
import { List } from "immutable";

import type { Model, Task } from "../../index.js";
import * as async_iterator from "../../utils/async_iterator.js";
import { BatchLogs, EpochLogs } from "../../models/index.js";

export interface RoundLogs {
  epochs: List<EpochLogs>;
}

/** Abstract class whose role is to train a model with a given dataset. This can be either done
 * locally (alone) or in a distributed way with collaborators.
 *
 * 1. Call `fitModel(dataset)` to start training.
 * 2. which will then call onRoundEnd once the round has ended.
 *
 * The onRoundEnd needs to be implemented to specify what actions to do when the round has ended, such as a communication step with collaborators.
 */
export abstract class Trainer {
  readonly #roundDuration: number;
  readonly #epochs: number;

  private training?: AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  >;

  constructor(
    task: Task,
    public readonly model: Model,
  ) {
    this.#roundDuration = task.trainingInformation.roundDuration;
    this.#epochs = task.trainingInformation.epochs;

    if (!Number.isInteger(this.#epochs / this.#roundDuration))
      throw new Error(`round duration ${this.#roundDuration} doesn't divide number of epochs ${this.#epochs}`);
  }

  protected abstract onRoundBegin(round: number): Promise<void>;
  protected abstract onRoundEnd(round: number): Promise<void>;

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
      await this.onRoundBegin(round);
      yield this.#runRound(dataset, valDataset);
      await this.onRoundEnd(round);
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
