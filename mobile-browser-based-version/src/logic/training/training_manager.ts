import * as memory from '../memory/model_io'
import { preprocessData } from '../dataset/preprocessing'
import { datasetGenerator } from '../dataset/dataset_generator'
import * as tf from '@tensorflow/tfjs'

const MANY_EPOCHS = 9999

/**
 * Class that deals with the model of a task.
 * Takes care of memory management of the model and the training of the model.
 */
export class TrainingManager {
  task: any;
  client: any;
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
    console.log('starting trainModel:')
    console.log(`data size: ${this.data.shape[0]}, split:${this.trainSplit}`)
    console.log(`batchSize=${this.batchSize}, trainSize=${this.trainSize}, roundDuration=${this.roundDuration}`)
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
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   * @param {Object} model The current model being trained.
   * @param {Number} epoch The current training loop's epoch.
   */
  async _onEpochBeginDistributed (epoch) {
    console.log(`EPOCH (${epoch + 1}):`)
  }

  /**
   * Method corresponding to the TFJS fit function's callback.
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
    console.log(
      `Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
    )
  }

  // TODO
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
    console.log(
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
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   */
  async _onTrainBegin () {
    await this.client.onTrainBeginCommunication(
      this.model,
      this.trainingInformant
    )
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
   * Function for training the model with data preprocessed before training
   * @param {Object} model Model to be trained using the function
   * @param {Object} trainingInformation Training information containing the training parameters
   * @param {Object} callbacks Callabcks used during training
   */

  async _modelFitData (model, trainingInformation, callbacks) {
    console.log('Fast training mode is used, data preprocessing is executed on the entire dataset at once')
    const tensor = preprocessData(this.data, trainingInformation)

    await model.fit(tensor, this.labels, {
      initialEpoch: this.model.getUserDefinedMetadata().epoch,
      epochs: trainingInformation.epochs ?? MANY_EPOCHS,
      batchSize: trainingInformation.batchSize,
      validationSplit: trainingInformation.validationSplit,
      shuffle: true,
      callbacks: callbacks
    })
  }

  /**
   * Function for training the model using batch wise preprocessing
   * @param {Object} model Model to be trained using the function
   * @param {Object} trainingInformation Training information containing the training parameters
   * @param {Object} callbacks Callabcks used during training
   */
  async _modelFitDataBatchWise (model, trainingInformation, callbacks) {
    console.log('Memory efficient training mode is used, data preprocessing is executed batch wise')
    // Creation of Dataset objects for training
    const trainData = tf.data
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

    const valData = tf.data
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

    await model.fitDataset(trainData, {
      epochs: trainingInformation.epochs,
      validationData: valData,
      callbacks: callbacks
    })
  }

  _updateEpoch () {
    this.epoch += 1
  }

  async _onBatchEndDistributed (
    batch,
    accuracy,
    validationAccuracy,
    trainingInformation
  ) {
    console.log('On batch end')
    console.log(
      `Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
    )
    console.log(`epoch:${this.epoch}, batch:${batch}, batchLength:${batch * this.batchSize}`)
    await this.client.onBatchEndCommunication(this.model, batch, this.batchSize, this.trainSize, this.roundDuration, this.epoch)
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
   *  Method that chooses the appropriate modelFitData function and defines the modelFit callbacks for local training.
   */
  async _trainLocally () {
    const info = this.task.trainingInformation

    const modelFit = (
      info.batchwisePreprocessing
        ? this._modelFitDataBatchWise
        : this._modelFitData
    ).bind(this)

    await modelFit(this.model, info, {
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

    const modelFit = (
      info.batchwisePreprocessing
        ? this._modelFitDataBatchWise
        : this._modelFitData
    ).bind(this)

    await modelFit(this.model, info, {
      onTrainBegin: async (logs) => {
        await this._onTrainBegin()
      },
      onTrainEnd: async (logs) => {
        await this._onTrainEnd()
      },
      onEpochBegin: async (epoch, logs) => {
        await this._onEpochBeginDistributed(epoch)
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

  _formatAccuracy (acc) {
    return (acc * 100).toFixed(2)
  }
}
