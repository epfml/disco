import type tf from '@tensorflow/tfjs'

import type { Memory, Model, Task, TrainingInformant } from '../../index.js'

import { RoundTracker } from './round_tracker.js'
import type { TrainerLog } from '../../logging/trainer_logger.js'
import { TrainerLogger } from '../../logging/trainer_logger.js'
import { EventEmitter } from '../../utils/event_emitter.js'

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

  private training?: AsyncGenerator<tf.Logs | undefined, void>
  private readonly trainerLogger: TrainerLogger

  /**
   * Constructs the training manager.
   * @param task the trained task
   * @param trainingInformant the training informant
   */
  constructor (
    public readonly task: Task,
    public readonly trainingInformant: TrainingInformant,
    public readonly memory: Memory,
    public readonly model: Model
  ) {
    this.trainerLogger = new TrainerLogger()
    this.roundTracker = new RoundTracker(task.trainingInformation.roundDuration)
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
      await this.onRoundBegin(logs.acc)
    }
  }

  // TODO never used
  protected onEpochBegin (_epoch: number, _logs?: tf.Logs): void {}

  /**
   * We update the training graph, this needs to be done on epoch end as there is no validation accuracy onBatchEnd.
   */
  protected onEpochEnd (epoch: number, logs?: tf.Logs): void {
    this.trainerLogger.onEpochEnd(epoch, logs)

    if (logs !== undefined && !isNaN(logs.acc) && !isNaN(logs.val_acc)) {
      this.trainingInformant.updateTrainingGraph(this.roundDecimals(logs.acc))
      this.trainingInformant.updateValidationGraph(this.roundDecimals(logs.val_acc))
      if (logs.val_loss !== undefined) {
        this.trainingInformant.loss = logs.val_loss
      }
    } else {
      this.trainerLogger.error('onEpochEnd: no logs available')
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
  async fitModel (
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>
  ): Promise<void> {
    if (this.training !== undefined) {
      throw new Error('training already running, cancel it before launching a new one')
    }

    this.trainingInformant.addMessage('Training started.')

    this.training = this.model.train(
      dataset,
      valDataset,
      this.task.trainingInformation.epochs,
      new EventEmitter({
        // TODO implement
        // epochBegin: () => this.onEpochBegin(),
        // epochEnd: () => this.onEpochEnd(),
        // batchBegin: async () => await this.onBatchBegin(),
        // batchEnd: async () => await this.onBatchEnd(),
      })
    )

    let epoch = 0 // TODO: Trainer's epoch is not the same as the epoch in this.training
    this.onEpochBegin(epoch)
    for await (const logs of this.training) {
      this.onEpochEnd(epoch, logs)

      epoch += 1
      if (epoch < this.task.trainingInformation.epochs) {
        this.onEpochBegin(epoch + 1)
      }
    }

    this.training = undefined
    this.trainingInformant.addMessage('Training finished.')
  }

  /**
   * Format accuracy
   */
  protected roundDecimals (accuracy: number, decimalsToRound: number = 2): number {
    return +(accuracy * 100).toFixed(decimalsToRound)
  }

  getTrainerLog (): TrainerLog {
    return this.trainerLogger.log
  }
}
