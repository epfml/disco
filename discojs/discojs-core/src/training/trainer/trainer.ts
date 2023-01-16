import { tf, Memory, Task, TrainingInformant, TrainingInformation, TrainingFunction, fitModelFunctions } from '../..'

import { RoundTracker } from './round_tracker'
import { TrainerLogger, TrainerLog } from '../../logging/trainer_logger'

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
  public readonly trainingInformation: TrainingInformation
  public readonly roundTracker: RoundTracker

  private stopTrainingRequested = false
  private readonly trainerLogger: TrainerLogger

  private readonly fitModelFunction: TrainingFunction

  /**
   * Constructs the training manager.
   * @param task the trained task
   * @param trainingInformant the training informant
   */
  constructor (
    public readonly task: Task,
    public readonly trainingInformant: TrainingInformant,
    public readonly memory: Memory,
    public readonly model: tf.LayersModel,
    fitModelFunction?: TrainingFunction
  ) {
    this.trainerLogger = new TrainerLogger()

    const trainingInformation = task.trainingInformation
    if (trainingInformation === undefined) {
      throw new Error('round duration is undefined')
    }
    this.trainingInformation = trainingInformation

    this.roundTracker = new RoundTracker(trainingInformation.roundDuration)
    this.fitModelFunction = fitModelFunction ?? fitModelFunctions.default
  }

  /**
   * Every time a round ends this function will be called
   */
  protected abstract onRoundEnd (accuracy: number): Promise<void>

  /** onBatchEnd callback, when a round ends, we call onRoundEnd (to be implemented for local and distributed instances)
   */
  protected async onBatchEnd (_: number, logs?: tf.Logs): Promise<void> {
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
   * We update the training graph, this needs to be done on epoch end as there is no validation accuracy onBatchEnd.
   */
  protected onEpochEnd (epoch: number, logs?: tf.Logs): void {
    this.trainerLogger.onEpochEnd(epoch, logs)

    if (logs !== undefined && !isNaN(logs.acc) && !isNaN(logs.val_acc)) {
      this.trainingInformant.updateTrainingGraph(this.roundDecimals(logs.acc))
      this.trainingInformant.updateValidationGraph(this.roundDecimals(logs.val_acc))
    } else {
      this.trainerLogger.error('onEpochEnd: NaN value')
    }
  }

  /**
   * When the training ends this function will be call
   */
  protected async onTrainEnd (logs?: tf.Logs): Promise<void> {
    this.trainingInformant.addMessage('Training finished.')
  }

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
  async fitModel (
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>
  ): Promise<void> {
    this.resetStopTrainerState()

    await this.fitModelFunction(this.model,
      this.trainingInformation,
      dataset,
      valDataset,
      (e, l) => this.onEpochEnd(e, l),
      async (e, l) => await this.onBatchEnd(e, l),
      async (l) => await this.onTrainEnd(l))
  }

  /**
   * Format accuracy
   */
  protected roundDecimals (accuracy: number, decimalsToRound: number = 2): number {
    return +(accuracy * 100).toFixed(decimalsToRound)
  }

  /**
   * reset stop training state
   */
  protected resetStopTrainerState (): void {
    this.model.stopTraining = false
    this.stopTrainingRequested = false
  }

  /**
   * If stop training is requested, do so
   */
  protected stopTrainModelIfRequested (): void {
    if (this.stopTrainingRequested) {
      this.model.stopTraining = true
      this.stopTrainingRequested = false
    }
  }

  getTrainerLog (): TrainerLog {
    return this.trainerLogger.log
  }
}
