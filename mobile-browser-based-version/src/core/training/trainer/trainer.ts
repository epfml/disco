import * as tf from '@tensorflow/tfjs'
import { Task, TrainingInformation } from '../../task/task'
import { RoundTracker } from '../trainer/round_tracker'
import { TrainingInformant } from '../training_informant'
import { TrainerLogger } from '../trainer/trainer_logger'

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
  task: Task;
  trainingInformant: TrainingInformant;
  useIndexedDB: boolean;
  stopTrainingRequested: boolean = false;
  model: tf.LayersModel;
  roundTracker: RoundTracker;
  trainerLogger: TrainerLogger;
  trainingInformation: TrainingInformation;

  /**
   * Constructs the training manager.
   * @param {Task} task the trained task
   * @param {TrainingInformant} trainingInformant the training informant
   * @param {boolean} useIndexedDB use IndexedDB (browser only)
   */
  constructor (task: Task, trainingInformant: TrainingInformant, useIndexedDB: boolean, roundTracker: RoundTracker, model: tf.LayersModel) {
    this.task = task
    this.trainingInformant = trainingInformant
    this.useIndexedDB = useIndexedDB
    this.roundTracker = roundTracker
    this.model = model
    this.trainerLogger = new TrainerLogger()
    this.trainingInformation = this.task.trainingInformation
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
   * Setter called by the UI to update the IndexedDB status midway through
   * training.
   * @param {Boolean} useIndexedDB whether or not to use IndexedDB
   */
  setIndexedDB (useIndexedDB: boolean) {
    this.useIndexedDB = useIndexedDB
  }

  /**
   * Request stop training to be used from the Disco instance or any class that is taking care of the trainer.
   */
  stopTraining () {
    this.stopTrainingRequested = true
  }

  /**
   * Start training the model with the given dataset
   * @param dataset
   */
  async trainModel (dataset: tf.data.Dataset<tf.TensorContainer>) {
    // Reset stopTraining setting
    this.resetStopTrainerState()

    // Assign callbacks and start training
    await this.model.fitDataset(dataset, {
      epochs: this.trainingInformation.epochs,
      // validationData: validationDataset,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          this.onEpochEnd(epoch, logs)
        },
        onBatchEnd: async (batch, logs) => {
          await this.onBatchEnd(batch, logs)
        }
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
  private onEpochEnd (epoch: number, logs: tf.Logs) {
    if (!isNaN(logs.acc) && !isNaN(logs.val_acc)) {
      this.trainerLogger.onEpochEnd(epoch, logs)
      this.trainingInformant.updateTrainingAccuracyGraph(this.roundDecimals(logs.acc))
      this.trainingInformant.updateValidationAccuracyGraph(this.roundDecimals(logs.val_acc))
    } else {
      this.trainerLogger.error('onEpochEnd: NaN value')
    }
  }

  /** onBatchEnd callback, when a round ends, we call onRoundEnd (to be implemented for local and distributed instances)
   */
  private async onBatchEnd (batch: number, logs: tf.Logs) {
    this.trainerLogger.onBatchEnd(batch, logs)
    this.roundTracker.updateBatch()
    this.stopTrainModelIfRequested()

    if (this.roundTracker.roundHasEnded()) {
      await this.onRoundEnd(logs.acc)
    }
  }

  /**
   * reset stop training state
   */
  private resetStopTrainerState () {
    this.model.stopTraining = false
    this.stopTrainingRequested = false
  }

  /**
   * If stop training is requested, do so
   */
  private stopTrainModelIfRequested () {
    if (this.stopTrainingRequested) {
      this.model.stopTraining = true
      this.stopTrainingRequested = false
    }
  }
}
