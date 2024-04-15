import type tf from "@tensorflow/tfjs";
import { List } from "immutable";

import type { Model, Task } from "../../index.js";

import { EpochLogs } from "../../models/model.js";

export interface RoundLogs {
  round: number;
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

  private training?: AsyncGenerator<EpochLogs, void>;

  constructor(
    task: Task,
    public readonly model: Model,
  ) {
    this.#roundDuration = task.trainingInformation.roundDuration;
    this.#epochs = task.trainingInformation.epochs;
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
  ): AsyncGenerator<RoundLogs> {
    if (this.training !== undefined) {
      throw new Error(
        "training already running, cancel it before launching a new one",
      );
    }

    await this.onRoundBegin(0);

    this.training = this.model.train(dataset, valDataset, this.#epochs);

    for await (const logs of this.training) {
      // for now, round (sharing on network) == epoch (full pass over local data)
      yield {
        round: logs.epoch,
        epochs: List.of(logs),
      };

      if (logs.epoch % this.#roundDuration === 0) {
        const round = Math.trunc(logs.epoch / this.#roundDuration);
        await this.onRoundEnd(round);
        await this.onRoundBegin(round);
      }
    }

    const round = Math.trunc(this.#epochs / this.#roundDuration);
    await this.onRoundEnd(round);

    this.training = undefined;
  }
}
