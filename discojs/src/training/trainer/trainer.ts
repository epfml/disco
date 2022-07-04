import * as tf from '@tensorflow/tfjs'

import { Memory, Task, TrainingInformant, TrainingInformation } from '@/.'

import { RoundTracker } from './round_tracker'
import { TrainerLogger, TrainerLog } from '../../logging/trainer_logger'

/** Abstract class whose role is to train a model with a given dataset. This can be either done
 * locally or in a distributed way. The Trainer works as follows:
 *
 * 1. Call trainModel(dataset) to start training
 * 2. Once a batch ends, onBatchEnd is triggered, witch will then call onRoundEnd once the round has ended.
 *
 * The onRoundEnd needs to be implemented to specify what actions to do when the round has ended. To know when
 * a round has ended we use the roundTracker object.
 */
export abstract class Trainer {
  public readonly trainingInformation: TrainingInformation
  public readonly roundTracker: RoundTracker

  private stopTrainingRequested = false
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
    public readonly model: tf.LayersModel
  ) {
    this.trainerLogger = new TrainerLogger()

    const trainingInformation = task.trainingInformation
    if (trainingInformation === undefined) {
      throw new Error('round duration is undefined')
    }
    this.trainingInformation = trainingInformation

    this.roundTracker = new RoundTracker(trainingInformation.roundDuration)
  }

  //* ***************************************************************
  //* Functions to be implemented by local and distributed training.
  //* ***************************************************************

  /**
   * Every time a round ends this function will be called
   */
  protected abstract onRoundEnd (accuracy: number): Promise<void>

  /**
   * When the training ends this function will be call
   */
  protected abstract onTrainEnd (): Promise<void>

  //* ***************************************************************
  //* Functions to be used by the training manager
  //* ***************************************************************

  /**
   * Request stop training to be used from the Disco instance or any class that is taking care of the trainer.
   */
  async stopTraining (): Promise<void> {
    this.stopTrainingRequested = true
  }

  /**
   * Start training the model with the given dataset
   * @param dataset
   */
  async trainModel (dataset: tf.data.Dataset<tf.TensorContainer>): Promise<void> {
    this.resetStopTrainerState()

    // Assign callbacks and start training
    await this.model.fitDataset(dataset.batch(this.trainingInformation.batchSize), {
      epochs: this.trainingInformation.epochs,
      validationData: dataset.batch(this.trainingInformation.batchSize),
      callbacks: {
        onEpochEnd: (epoch, logs) => this.onEpochEnd(epoch, logs),
        onBatchEnd: async (epoch, logs) => await this.onBatchEnd(epoch, logs)
      }
    })
  }

  /**
   * Format accuracy
   */
  private roundDecimals (accuracy: number, decimalsToRound: number = 2): number {
    return +(accuracy * 100).toFixed(decimalsToRound)
  }

  /**
   * We update the training graph, this needs to be done on epoch end as there is no validation accuracy onBatchEnd.
   */
  private onEpochEnd (epoch: number, logs?: tf.Logs): void {
    this.trainerLogger.onEpochEnd(epoch, logs)

    if (logs !== undefined && !isNaN(logs.acc) && !isNaN(logs.val_acc)) {
      this.trainingInformant.updateTrainingGraph(this.roundDecimals(logs.acc))
      this.trainingInformant.updateValidationGraph(this.roundDecimals(logs.val_acc))
    } else {
      this.trainerLogger.error('onEpochEnd: NaN value')
    }
  }

  /** onBatchEnd callback, when a round ends, we call onRoundEnd (to be implemented for local and distributed instances)
   */
  private async onBatchEnd (_: number, logs?: tf.Logs): Promise<void> {
    if (logs === undefined) {
      return
    }

    this.roundTracker.updateBatch()
    this.stopTrainModelIfRequested()

    if (this.roundTracker.roundHasEnded()) {
      await this.onRoundEnd(logs.acc)
    }
  }

  /**
   * reset stop training state
   */
  private resetStopTrainerState (): void {
    this.model.stopTraining = false
    this.stopTrainingRequested = false
  }

  /**
   * If stop training is requested, do so
   */
  private stopTrainModelIfRequested (): void {
    if (this.stopTrainingRequested) {
      this.model.stopTraining = true
      this.stopTrainingRequested = false
    }
  }

  getTrainerLog (): TrainerLog {
    return this.trainerLogger.log
  }
}
