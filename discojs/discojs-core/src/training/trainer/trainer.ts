import { tf, Memory, Task, TrainingInformant, data } from '../..'
import { RoundTracker } from './round_tracker'
import { TrainerLogger, TrainerLog } from '../../logging/trainer_logger'
import { Model } from '../model'

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
  public async onBatchEnd (_: number, logs?: tf.Logs): Promise<void> {
    if (logs === undefined) {
      return
    }

    this.roundTracker.updateBatch()
    this.stopTrainModelIfRequested()

    if (this.roundTracker.roundHasEnded()) {
      await this.onRoundEnd(logs.acc)
    }
  }

  async onBatchBegin (_: number, logs?: tf.Logs): Promise<void> {
    if (logs === undefined) {
      return
    }

    if (this.roundTracker.roundHasBegun()) {
      await this.onRoundBegin(logs.acc)
    }
  }

  onEpochBegin (epoch: number, logs?: tf.Logs): void {}

  /**
   * We update the training graph, this needs to be done on epoch end as there is no validation accuracy onBatchEnd.
   */
  onEpochEnd (epoch: number, logs?: tf.Logs): void {
    this.trainerLogger.onEpochEnd(epoch, logs)

    if (logs !== undefined && !isNaN(logs.acc) && !isNaN(logs.val_acc)) {
      this.trainingInformant.updateTrainingGraph(this.roundDecimals(logs.acc))
      this.trainingInformant.updateValidationGraph(this.roundDecimals(logs.val_acc))
    } else {
      this.trainerLogger.error('onEpochEnd: NaN value')
    }
  }

  async onTrainBegin (logs?: tf.Logs): Promise<void> {
    this.trainingInformant.addMessage('Training started.')
  }

  /**
   * When the training ends this function will be call
   */
  async onTrainEnd (logs?: tf.Logs): Promise<void> {
    this.trainingInformant.addMessage('Training finished.')
  }

  /**
   * Request stop training to be used from the Disco instance or any class that is taking care of the trainer.
   */
  async stopTraining (): Promise<void> {
    this.stopTrainingRequested = true
  }

  /**
   * Starts training the model with the given dataset. The exact behavior for model weights updates
   * is model-dependent and is thus left to the model. The trainer instance is given for the fit function
   * to be able to access the regular TF.js training hooks, which may include communication in the case of
   * decentralized & federated learning.
   * @param dataset
   */
  async fitModel (
    data: data.tuple.DataSplit
  ): Promise<void> {
    this.resetStopTrainerState()

    await this.model.fit(this, data)
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
    this.model.raw.stopTraining = false
    this.stopTrainingRequested = false
  }

  /**
   * If stop training is requested, do so
   */
  protected stopTrainModelIfRequested (): void {
    if (this.stopTrainingRequested) {
      this.model.raw.stopTraining = true
      this.stopTrainingRequested = false
    }
  }

  getTrainerLog (): TrainerLog {
    return this.trainerLogger.log
  }
}
