import * as tf from '@tensorflow/tfjs'

import { Task, TrainingInformation, TrainingInformant } from 'discojs'

import { RoundTracker } from './round_tracker'
import { TrainerLogger } from './trainer_logger'

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
  constructor (task: Task, trainingInformant: TrainingInformant, useIndexedDB: boolean, model: tf.LayersModel) {
    this.task = task
    this.trainingInformant = trainingInformant
    this.useIndexedDB = useIndexedDB
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
   * Build a round tracker, this keeps track of what round a training environment is currently on.
   *
   * @param trainSize number of samples in the training set
   * @returns
   */
  private initRoundTracker (trainSize: number) {
    const batchSize = this.task.trainingInformation.batchSize
    const roundDuration = this.task.trainingInformation.roundDuration
    this.roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
  }

  /**
   * Start training the model with the given dataset
   * @param dataset
   */
  async trainModel (dataset: tf.data.Dataset<tf.TensorContainer>, trainSize: number) {
    // Init round tracker - requires size info
    this.initRoundTracker(trainSize)

    // Reset stopTraining setting
    this.resetStopTrainerState()

    // const { trainingDataset, validationDataset } = this.validationSplit(dataset)

    // Assign callbacks and start training
    await this.model.fitDataset(dataset.batch(this.task.trainingInformation.batchSize), {
      epochs: this.trainingInformation.epochs,
      // TODO: not yet implemented, validationData: validationDataset,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          this.onEpochEnd(logs.acc, logs.val_acc)
        },
        onBatchEnd: async (batch, logs) => {
          await this.onBatchEnd(batch + 1, logs.acc)
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
  private onEpochEnd (trainingAccuracy: number, validationAccuracy: number) {
    this.trainerLogger.onEpochEnd(trainingAccuracy, validationAccuracy)
    if (!isNaN(trainingAccuracy) && !isNaN(validationAccuracy)) {
      this.trainingInformant.updateValidationAccuracyGraph(this.roundDecimals(validationAccuracy))
      this.trainingInformant.updateTrainingAccuracyGraph(this.roundDecimals(trainingAccuracy))
    }
  }

  /** onBatchEnd callback, when a round ends, we call onRoundEnd (to be implemented for local and distributed instances)
   */
  private async onBatchEnd (batch: number, accuracy: number) {
    this.trainerLogger.onBatchEnd(batch, accuracy)
    this.roundTracker.updateBatch()
    this.stopTrainModelIfRequested()

    if (this.roundTracker.roundHasEnded()) {
      await this.onRoundEnd(accuracy)
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

  private validationSplit (dataset: tf.data.Dataset<tf.TensorContainer>) {
    // TODO: not yet implemented
  }
}
