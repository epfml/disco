import * as memory from '../memory/model_io'
import { datasetGenerator } from '../dataset/dataset_generator'
import * as tf from '@tensorflow/tfjs'
import { logger } from '../logging/console_logger'
import { Client } from '../communication/client'

// TODO: user trainingInformant and task as class

/**
 * Class that deals with the model of a task.
 * Takes care of memory management of the model and the training of the model.
 */
export class TrainingManager {
  task: any;
  client: Client;
  trainingInformant: any;
  useIndexedDB: boolean;
  stopTrainingRequested: boolean;
  model: any;
  data: any;
  labels: any;
  trainSize: number = 0;
  batchSize: number;
  trainSplit: number;
  roundDuration: number;
  epoch: number = 0;

  /**
   * Constructs the training manager.
   * @param {Object} task the trained task
   * @param {Object} client the client
   * @param {Object} trainingInformant the training informant
   * @param {Boolean} useIndexedDB use IndexedDB (browser only)
   */
  constructor (task, client, trainingInformant, useIndexedDB) {
    this.task = task
    this.client = client
    this.trainingInformant = trainingInformant

    this.useIndexedDB = useIndexedDB
    this.stopTrainingRequested = false

    this.model = null
    this.data = null
    this.labels = null
    this.trainSplit = 1 - task.trainingInformation.validationSplit
    this.batchSize = task.trainingInformation.batchSize
    this.roundDuration = task.trainingInformation.roundDuration
  }

  /**
   * Setter called by the UI to update the IndexedDB status midway through
   * training.
   * @param {Boolean} payload whether or not to use IndexedDB
   */
  setIndexedDB (payload) {
    this.useIndexedDB = !!payload
  }

  stopTraining () {
    this.stopTrainingRequested = true
  }

  /**
   * Train the task's model either alone or in a distributed fashion depending on the user's choice.
   * @param {Object} dataset the dataset to train on
   * @param {Boolean} distributedTraining train in a distributed fashion
   */
  async trainModel (dataset, distributedTraining) {
    this.data = dataset.Xtrain
    this.labels = dataset.ytrain

    // Init train size used for keeping track of round
    this.trainSize = this.data.shape[0] * this.trainSplit

    // TODO have a pretty print logging the setup of train
    logger.success('starting trainModel, setup:')
    logger.success(`data size: ${this.data.shape[0]}, split: ${this.trainSplit}`)
    logger.success(`batchSize: ${this.batchSize}, trainSize: ${this.trainSize}, roundDuration: ${this.roundDuration}`)
    /**
     * If IndexedDB is turned on and the working model exists, then load the
     * existing model from IndexedDB. Otherwise, create a fresh new one.
     */
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

    // Continue local training from previous epoch checkpoint
    if (this.model.getUserDefinedMetadata() === undefined) {
      this.model.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    this.model.compile(info.modelCompileData)

    if (info.learningRate) {
      this.model.optimizer.learningRate = info.learningRate
    }

    // Ensure training can start
    this.model.stopTraining = false
    this.stopTrainingRequested = false

    distributedTraining ? this._trainDistributed() : this._trainLocally()
  }

  /**
   *  Method that chooses the appropriate modelFitData function and defines the modelFit callbacks for local training.
   */
  async _trainLocally () {
    const info = this.task.trainingInformation

    await this._modelFitDataBatchWise(this.model, info, {
      onEpochEnd: async (epoch, logs) => {
        this._onEpochEndLocal(
          epoch,
          this._formatAccuracy(logs.acc),
          this._formatAccuracy(logs.val_acc),
          info
        )
      }
    })
  }

  /**
     *  Method that chooses the appropriate modelFitData function and defines the modelFit callbacks for distributed training.
     */
  async _trainDistributed () {
    const info = this.task.trainingInformation

    await this.client.init()

    await this._modelFitDataBatchWise(this.model, info, {
      onTrainEnd: async (logs) => {
        await this._onTrainEnd()
      },
      onEpochEnd: async (epoch, logs) => {
        await this._onEpochEndDistributed(
          epoch + 1,
          this._formatAccuracy(logs.acc),
          this._formatAccuracy(logs.val_acc),
          info
        )
      },
      onBatchEnd: async (batch, logs) => {
        this._onBatchEndDistributed(
          batch + 1,
          this._formatAccuracy(logs.acc),
          this._formatAccuracy(logs.val_acc),
          info
        )
      }
    })
  }

  /**
   * Callback functions
   */

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine used in local training
   */
  async _onEpochEndLocal (
    epoch,
    accuracy,
    validationAccuracy,
    trainingInformation
  ) {
    this._updateEpoch()
    this.trainingInformant.updateGraph(epoch + 1, validationAccuracy, accuracy)
    logger.success(
        `EPOCH (${epoch + 1}):
        Train Accuracy: ${accuracy},
        Val Accuracy:  ${validationAccuracy}\n`
    )
    if (this.useIndexedDB) {
      this.model.setUserDefinedMetadata({ epoch: epoch + 1 })
      await memory.updateWorkingModel(
        this.task.taskID,
        trainingInformation.modelID,
        this.model
      )
    }
    if (this.stopTrainingRequested) {
      this.model.stopTraining = true
      this.stopTrainingRequested = false
    }
  }

  /**
   * We update the graph, other important updates such as weight sharing is done in onBatchEnd due to new
   * fractional round setting.
   * @param {Number} epoch The current training loop's epoch.
   * @param {Number} accuracy The accuracy achieved by the model in the given epoch
   * @param {Number} validationAccuracy The validation accuracy achieved by the model in the given epoch
   * @param {Object} trainingInformation Training information about the model and training parameters
   */
  async _onEpochEndDistributed (
    epoch,
    accuracy,
    validationAccuracy,
    trainingInformation
  ) {
    // Important: needed for onBatchEnd
    this._updateEpoch()
    this.trainingInformant.updateGraph(epoch, validationAccuracy, accuracy)
    logger.success(
      `Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
    )
  }

  /**
   * On batch end we call the onBatchEndCommunication of client, this in turn will call the onRoundEnd whenever a round has ended.
   *
   * @Remark Since we support fractional rounds this might before an epoch, since it might be after an epoch, we keep track of
   * epochs globally and pass it as an argument.
   * @param batch
   * @param accuracy
   * @param validationAccuracy
   * @param trainingInformation
   */
  async _onBatchEndDistributed (
    batch,
    accuracy,
    validationAccuracy,
    trainingInformation
  ) {
    logger.success('On batch end')
    logger.success(
      `Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
    )
    logger.success(`epoch:${this.epoch}, batch:${batch}, batchLength:${batch * this.batchSize}`)
    await this.client.onBatchEndCommunication(this.model, batch, this.batchSize, this.trainSize, this.roundDuration, this.epoch, this.trainingInformant)
    if (this.useIndexedDB) {
      await memory.updateWorkingModel(
        this.task.taskID,
        trainingInformation.modelID,
        this.model
      )
    }
    if (this.stopTrainingRequested) {
      this.model.stopTraining = true
      this.stopTrainingRequested = false
    }
  }

  /**
   * Function for training the model using batch wise preprocessing.
   * @param {Object} model Model to be trained using the function
   * @param {Object} trainingInformation Training information containing the training parameters
   * @param {Object} callbacks Callabcks used during training
   */
  async _modelFitDataBatchWise (model, trainingInformation, callbacks) {
    const trainData = this._buildTrainDataset(trainingInformation)
    const valData = this._buildValidationDataset(trainingInformation)

    await model.fitDataset(trainData, {
      epochs: trainingInformation.epochs,
      validationData: valData,
      callbacks: callbacks
    })
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   */
  async _onTrainEnd () {
    await this.client.onTrainEndCommunication(
      this.model,
      this.trainingInformant
    )
  }

  /**
   * Builds the train dataset
   * @param trainingInformation
   * @returns
   */
  _buildTrainDataset (trainingInformation) {
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
   * @param trainingInformation
   * @returns
   */
  _buildValidationDataset (trainingInformation) {
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
   * We use batch wise preprocessing so it important
   * to keep track of the current epoch.
   */
  _updateEpoch () {
    this.epoch += 1
  }

  /**
   * Format accuracy
   */
  _formatAccuracy (accuracy) {
    return (accuracy * 100).toFixed(2)
  }
}
