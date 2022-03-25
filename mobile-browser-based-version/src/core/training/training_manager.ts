<<<<<<< HEAD
import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer/trainer'
import { DistributedTrainer } from './trainer/distributed_trainer'
import { LocalTrainer } from './trainer/local_trainer'
import { Client } from '../communication/client'
import { Task } from '../task/task'
import { Logger } from '../logging/logger'
import { Platform } from '../../platforms/platform'
import { RoundTracker } from './trainer/round_tracker'
import * as memory from '../memory/utils'
import * as tf from '@tensorflow/tfjs'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class TrainingManager {
  platform: Platform
  task: Task
  client: Client
  trainer: Trainer
  logger: Logger
  trainingInformant: TrainingInformant
  isConnected: boolean
  isTraining: boolean
  distributedTraining: boolean
  useIndexedDB: boolean

  constructor (task: Task, platform: Platform, logger: Logger, useIndexedDB: boolean) {
    this.task = task
    this.logger = logger
=======
import { ModelActor } from '../model_actor'
import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer/trainer'
import { Client } from '../communication/client'
import { Task } from '../task/base/task'
import { Logger } from '../logging/logger'
import { TaskHelper } from '../task/base/task_helper'
import { Platform } from '../../platforms/platform'
import { TrainerBuilder } from './trainer/trainer_builder'
import { getClient } from '../communication/client_builder'

// number of files that should be loaded (required by the task)
function nbrFiles (task: Task) {
  const labelList = task.trainingInformation.LABEL_LIST
  return labelList ? labelList.length : 1
}
export class TrainingManager extends ModelActor {
  isConnected: Boolean
  isTraining: Boolean
  distributedTraining: Boolean
  platform: Platform
  useIndexedDB: boolean
  client: Client
  trainingInformant: TrainingInformant
  trainer: () => Trainer // we keep trainer as a function call due to reactivity issues with vue. (by @giordano-lucas)
  /**
   * Constructor for TrainingManager
   * @param {Task} task - task on which the tasking shall be performed
   * @param {string} platform - system platform (e.g. deai or feai)
   * @param {Logger} logger - logging system (e.g. toaster)
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor (task: Task, platform: Platform, logger: Logger, helper: TaskHelper<Task>, useIndexedDB: boolean) {
    super(task, logger, nbrFiles(task), helper)
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
    this.isConnected = false
    this.isTraining = false
    this.distributedTraining = false
    this.platform = platform
    this.useIndexedDB = useIndexedDB
<<<<<<< HEAD
    this.client = Client.getClient(
=======
    // Take care of communication processes
    this.client = getClient(
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
      this.platform,
      this.task,
      null // TODO: this.$store.getters.password(this.id)
    )
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
  }

  /**
<<<<<<< HEAD
   * Connects the TrainingManager to the server
   */
  async connect () {
=======
   * Build the appropriate training class (either local or distributed)
   */
  private async initTrainer (dataset) {
    const trainerBuilder = new TrainerBuilder(
      this.useIndexedDB, this.task, this.trainingInformant
    )
    const trainSize = this.getTrainSize(dataset)
    const trainer = await (this.distributedTraining
      ? trainerBuilder.buildDistributedTrainer(trainSize, this.client)
      : trainerBuilder.buildLocalTrainer(trainSize))

    // make property un-reactive through anonymous function accessor
    // otherwise get unexpected TFJS error due to Vue double bindings
    // on the loaded model
    this.trainer = () => trainer
  }

  /**
   * TODO: can be integrated to the dataset classes @s314cy
   * Get the number of samples in the training set.
   */
  private getTrainSize (dataset): number {
    const trainSplit = 1 - this.task.trainingInformation.validationSplit
    return dataset.Xtrain.shape[0] * trainSplit
  }

  /**
   * Connects the TrainingManager to the server
   */
  async connectClientToServer () {
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
    // Connect to centralized server
    this.isConnected = await this.client.connect()
    if (this.isConnected) {
      this.logger.success(
        'Successfully connected to server. Distributed training available.'
      )
    } else {
      console.log('Error in connecting')
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      )
    }
    return this.isConnected
  }

  /**
<<<<<<< HEAD
   * Disconnects the client from the server
=======
   * Disconnects the TrainingManager from the server
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
   */
  disconnect () {
    this.client.disconnect()
  }

  /**
<<<<<<< HEAD
   * @param {any} dataset The preprocessed dataset to train on
   * @param {boolean} distributed Whether to train in a distributed or local fashion
   */
  async startTraining (dataset: tf.data.Dataset<tf.TensorContainer>, distributed: boolean) {
    if (distributed && !this.isConnected) {
      await this.connect()
=======
   * TODO: @s314cy, this function needs to be cleaned up with the new data loader update.
   * Main training function
   * @param {boolean} distributed - use distributed training (true) or local training (false)
   */
  async joinTraining (distributed: boolean) {
    if (distributed && !this.isConnected) {
      await this.connectClientToServer()
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
      if (!this.isConnected) {
        distributed = false
        this.logger.error('Distributed training is not available.')
      }
    }
    this.distributedTraining = distributed
<<<<<<< HEAD
    if (dataset.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
    } else {
      this.logger.success(
        'Thank you for your contribution. Data preprocessing has started'
      )
      this.initTrainer(dataset)
      this.trainer.trainModel(dataset)
      this.isTraining = true
=======
    const nbrFiles = this.fileUploadManager.numberOfFiles()
    // Check that the user indeed gave a file
    if (nbrFiles === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
    } else {
      // Assume we only read the first file
      this.logger.success(
        'Thank you for your contribution. Data preprocessing has started'
      )
      const filesElement =
        nbrFiles > 1
          ? this.fileUploadManager.getFilesList()
          : this.fileUploadManager.getFirstFile()
      // get task  specific information (preprocessing steps, pre-check function)
      const statusValidation = await this.taskHelper.preCheckData(filesElement)
      if (statusValidation.accepted) {
        // preprocess data
        const processedDataset = await this.taskHelper.dataPreprocessing(
          filesElement
        )
        this.logger.success(
          'Data preprocessing has finished and training has started'
        )
        await this.initTrainer(processedDataset)
        this.trainer().trainModel(processedDataset)
        this.isTraining = true
      } else {
        // print error message
        this.logger.error(
          `Invalid input format : Number of data points with valid format: ${statusValidation.nbAccepted} out of ${nbrFiles}`
        )
      }
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
    }
  }

  /**
   * Stops the training function and disconnects from
   */
  async stopTraining () {
<<<<<<< HEAD
    this.trainer.stopTraining()
=======
    this.trainer().stopTraining()
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
    if (this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
    this.logger.success('Training was successfully interrupted.')
    this.isTraining = false
  }
<<<<<<< HEAD

  /**
   * Build the appropriate training class (either local or distributed)
   */
  private async initTrainer (dataset: any) {
    const roundTracker = new RoundTracker(
      this.task.trainingInformation.roundDuration,
      dataset.size(),
      this.task.trainingInformation.batchSize
    )
    const params = [
      this.task,
      this.trainingInformant,
      this.useIndexedDB,
      roundTracker,
      await this.getModel()
    ] as const
    if (this.distributedTraining) {
      this.trainer = new DistributedTrainer(...params, this.client)
    } else {
      this.trainer = new LocalTrainer(...params)
    }
  }

  private async getModel () {
    const model = await this.getModelFromMemoryOrFetchIt()
    return this.updateModelInformation(model)
  }

  /**
   *
   * @returns
   */
  private async getModelFromMemoryOrFetchIt () {
    const modelExistsInMemory = await memory.getWorkingModelMetadata(
      this.task.taskID,
      this.task.trainingInformation.modelID
    )

    if (this.useIndexedDB && modelExistsInMemory) {
      await memory.getWorkingModel(
        this.task.taskID,
        this.task.trainingInformation.modelID
      )
    }
    return await this.client.getModel()
  }

  private updateModelInformation (model: tf.LayersModel) {
    // Continue local training from previous epoch checkpoint
    if (model.getUserDefinedMetadata() === undefined) {
      model.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    model.compile(info.modelCompileData)

    if (info.learningRate) {
      // TODO: Not the right way to change learningRate and hence we cast to any
      // the right way is to construct the optimiser and pass learningRate via
      // argument.
      (model.optimizer as any).learningRate = info.learningRate
    }

    return model
  }
=======
>>>>>>> ac58a0cd1c50e6d846ac9fa403768c683eee716e
}
