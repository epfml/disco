import * as memory from '../memory/model_io'
import { datasetGenerator } from '../dataset/dataset_generator'
import * as tf from '@tensorflow/tfjs'
import { logger } from '../logging/console_logger'
import { Client } from '../communication/client'
import { Task, TrainingInformation } from '../task_definition/base/task'
import { RoundTracker } from './round_tracker'
import { TrainingInformant } from './training_informant'

/** Abstract class whose role is to train a model with a given dataset. This can be either done
 * locally or in a distributed way.
 */
export abstract class Trainer {
  task: Task;
  client: Client;
  trainingInformant: TrainingInformant;
  useIndexedDB: boolean;
  stopTrainingRequested: boolean = false;
  model: tf.LayersModel;
  data: any; // TODO: use class type @s314cy once you have created the dataset class
  labels: any; // TODO: use class type @s314cy once you have created the dataset class
  roundTracker: RoundTracker

  /**
   * Constructs the training manager.
   * @param {Object} task the trained task
   * @param {Object} client the client
   * @param {Object} trainingInformant the training informant
   * @param {Boolean} useIndexedDB use IndexedDB (browser only)
   */
  constructor (task: Task, client: Client, trainingInformant: TrainingInformant, useIndexedDB: boolean, roundTracker: RoundTracker) {
    this.task = task
    this.client = client
    this.trainingInformant = trainingInformant
    this.useIndexedDB = useIndexedDB
    this.roundTracker = roundTracker
  }

  abstract trainModel(dataset): Promise<void>

  /**
   * Setter called by the UI to update the IndexedDB status midway through
   * training.
   * @param {Boolean} useIndexedDB whether or not to use IndexedDB
   */
  setIndexedDB (useIndexedDB: boolean) {
    this.useIndexedDB = useIndexedDB
  }

  /**
   * Request stop training to be used from the training_manager or any class that is taking care of the trainer.
   */
  stopTraining () {
    this.stopTrainingRequested = true
  }

  async _fetchModelFromIndexedDBOrCreateNewOne () {
    if (
      this.useIndexedDB &&
      (await memory.getWorkingModelMetadata(
        this.task.taskID,
        this.task.trainingInformation.modelID
      ))
    ) {
      this.model = await memory.getWorkingModel(
        this.task.taskID,
        this.task.trainingInformation.modelID
      )
    } else {
      this.model = await this.task.createModel()
    }
  }

  /**
   * Train the task's model either alone or in a distributed fashion depending on the user's choice.
   * @param {Object} dataset the dataset to train on
   * @param {Boolean} distributedTraining train in a distributed fashion
   */
  async _initDatasetAndModel (dataset) {
    this.data = dataset.Xtrain
    this.labels = dataset.ytrain

    /**
     * If IndexedDB is turned on and the working model exists, then load the
     * existing model from IndexedDB. Otherwise, create a fresh new one.
     */
    await this._fetchModelFromIndexedDBOrCreateNewOne()

    // Continue local training from previous epoch checkpoint
    if (this.model.getUserDefinedMetadata() === undefined) {
      this.model.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    this.model.compile(info.modelCompileData)

    if (info.learningRate) {
      // TODO: Not the right way to change learningRate and hence we cast to any
      // the right way is to construct the optimiser and pass learningRate via
      // argument.
      (this.model.optimizer as any).learningRate = info.learningRate
    }

    // Ensure training can start
    this.model.stopTraining = false
    this.stopTrainingRequested = false
  }

  /**
   * Function for training the model using batch wise preprocessing.
   * @param {Object} model Model to be trained using the function
   * @param {Object} trainingInformation Training information containing the training parameters
   * @param {Object} callbacks Callabcks used during training
   */
  async _modelFitDataBatchWise (model, trainingInformation: TrainingInformation, callbacks) {
    const trainData = this._buildTrainDataset(trainingInformation)
    const valData = this._buildValidationDataset(trainingInformation)

    console.log('type of model', typeof (model))

    await model.fitDataset(trainData, {
      epochs: trainingInformation.epochs,
      validationData: valData,
      callbacks: callbacks
    })
  }

  /**
   * We update the training graph, this needs to be done on epoch end as there is no validation accuracy onBatchEnd.
   */
  _onEpochEnd (accuracy: number, validationAccuracy: number) {
    console.log('Epoch end', this._formatAccuracy(accuracy), this._formatAccuracy(validationAccuracy))
    // updateGraph does not work in onBatchEnd since we do not get validation accuracy.
    this.trainingInformant.updateGraph(this._formatAccuracy(accuracy), this._formatAccuracy(validationAccuracy))
  }

  /**
   * If stop training is requested, do so
   */
  _stopTrainModelIfRequested () {
    if (this.stopTrainingRequested) {
      this.model.stopTraining = true
      this.stopTrainingRequested = false
    }
  }

  /**
   * Common onBatchEnd functionality for local and distributed training:
   * - Log information
   * - stop training if requested.
   */
  _onBatchEnd (batch: number, accuracy: string, trainingInformation: TrainingInformation) {
    this.roundTracker.updateBatch()
    this._logBatchEnd(batch, accuracy)
    this._stopTrainModelIfRequested()
  }

  // *********************************************************************************************
  // *********************************************************************************************
  // ************  misc (builders, formatters, checkers, ...)
  // *********************************************************************************************
  // *********************************************************************************************

  /**
   * Builds the train dataset
   * TODO: @s314cy, put these build dataset functions in the dataset class.
   * @param trainingInformation
   * @returns
   */
  _buildTrainDataset (trainingInformation: TrainingInformation) {
    return tf.data
      .generator(
        datasetGenerator(
          this.data,
          this.labels,
          0,
          this.data.shape[0] * (1 - trainingInformation.validationSplit),
          trainingInformation
        )
      )
      .batch(trainingInformation.batchSize)
  }

  /**
   * Builds the validation data set
   * TODO: @s314cy, put these build dataset functions in the dataset class.
   * @param trainingInformation
   * @returns
   */
  _buildValidationDataset (trainingInformation: TrainingInformation) {
    return tf.data
      .generator(
        datasetGenerator(
          this.data,
          this.labels,
          Math.floor(
            this.data.shape[0] * (1 - trainingInformation.validationSplit)
          ),
          this.data.shape[0],
          trainingInformation
        )
      )
      .batch(trainingInformation.batchSize)
  }

  /**
   * Format accuracy
   */
  _formatAccuracy (accuracy: number) {
    return (accuracy * 100).toFixed(2)
  }

  _logAccuracy (accuracy: number, validationAccuracy: number) {
    logger.success(
      `Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
    )
  }

  _logBatchEnd (batch: number, accuracy: string) {
    logger.success(`On batch end:${batch}`)
    logger.success(`Train Accuracy: ${accuracy}`)
  }
}
