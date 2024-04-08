import type tf from "@tensorflow/tfjs";
import { List } from "immutable";

import type { Memory, Model, Task } from "../../index.js";

import { RoundTracker } from "./round_tracker.js";
import { EventEmitter } from "../../utils/event_emitter.js";
import { EpochLogs } from "../../models/model.js";

export interface RoundLogs {
  round: number;
  epoches: List<EpochLogs>;
}

/** Abstract class whose role is to train a model with a given dataset. This can be either done
 * locally (alone) or in a distributed way with collaborators. The Trainer works as follows:
 *
 * 1. Call trainModel(dataset) to start training
 * 2. Once a batch ends, onBatchEnd is triggered, which will then call onRoundEnd once the round has ended.
 *
 * The onRoundEnd needs to be implemented to specify what actions to do when the round has ended, such as a communication step with collaborators. To know when
 * a round has ended we use the roundTracker object.
 */
export abstract class Trainer {
  public readonly roundTracker: RoundTracker

  private training?: AsyncGenerator<EpochLogs, void>;

  /**
   * Constructs the training manager.
   * @param task the trained task
   */
  constructor(
    public readonly task: Task,
    public readonly memory: Memory,
    public readonly model: Model,
  ) {
    this.roundTracker = new RoundTracker(
      task.trainingInformation.roundDuration,
    );
  }

  protected abstract onRoundBegin (accuracy: number): Promise<void>

  /**
   * Every time a round ends this function will be called
   */
  protected abstract onRoundEnd (accuracy: number): Promise<void>

  /**
   * Callback executed on every batch end. When a round ends, onRoundEnd is called
   */
  protected async onBatchEnd (_: number, logs?: tf.Logs): Promise<void> {
    if (logs === undefined) {
      return
    }

    this.roundTracker.updateBatch()

    if (this.roundTracker.roundHasEnded()) {
      await this.onRoundEnd(logs.acc)
    }
  }

  protected async onBatchBegin (_: number, logs?: tf.Logs): Promise<void> {
    if (logs === undefined) {
      return
    }

    if (this.roundTracker.roundHasBegun()) {
      await this.onRoundBegin(logs.acc);
    }
  }

  /**
   * Request stop training to be used from the Disco instance or any class that is taking care of the trainer.
   */
  async stopTraining (): Promise<void> {
    await this.training?.return()
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

    this.training = this.model.train(
      dataset,
      valDataset,
      this.task.trainingInformation.epochs,
      new EventEmitter({
        // TODO implement
        // batchBegin: async () => await this.onBatchBegin(),
        // batchEnd: async () => await this.onBatchEnd(),
      }),
    );

    for await (const logs of this.training) {
      // for now, round (sharing on network) == epoch (full pass over local data)
      yield {
        round: logs.epoch,
        epoches: List.of(logs),
      };
    }

    this.training = undefined;
  }
}
