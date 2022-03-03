import { ModelActor } from '../model_actor'
import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer'
import { LocalTrainer } from './local_trainer'
import { DistributedTrainer } from './distributed_trainer'
import { getClient } from '../communication/client_builder'
import { Client } from '../communication/client'
import { RoundTracker } from './round_tracker'
import { Task } from '../task_definition/base/task'
import { Logger } from '../logging/logger'
import { TaskHelper } from '../task_definition/base/task_helper'

// number of files that should be loaded (required by the task)
function nbrFiles (task: Task) {
  const labelList = task.trainingInformation.LABEL_LIST
  return labelList ? labelList.length : 1
}
export class TrainingManager extends ModelActor {
  isConnected: Boolean
  isTraining: Boolean
  distributedTraining: Boolean
  platform: String
  useIndexedDB: boolean
  client: Client
  trainingInformant: TrainingInformant
  trainer: () => Trainer
  /**
   * Constructor for TrainingManager
   * @param {Task} task - task on which the tasking shall be performed
   * @param {string} platform - system platform (e.g. deai or feai)
   * @param {Logger} logger - logging system (e.g. toaster)
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor (task: Task, platform, logger: Logger, helper: TaskHelper<Task>, useIndexedDB: boolean) {
    super(task, logger, nbrFiles(task), helper)
    this.isConnected = false
    this.isTraining = false
    this.distributedTraining = false
    this.platform = platform
    this.useIndexedDB = useIndexedDB
    // Take care of communication processes
    this.client = getClient(
      this.platform,
      this.task,
      null // TODO: this.$store.getters.password(this.id)
    )
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
  }

  /**
   * Build a round tracker, this keeps track of what round a training environment is currently on.
   */
  _buildRoundTracker (dataset) {
    const batchSize = this.task.trainingInformation.batchSize
    const roundDuration = this.task.trainingInformation.roundDuration
    const trainSize = this._getTrainSize(dataset)
    return new RoundTracker(roundDuration, trainSize, batchSize)
  }

  /**
   * TODO: can be integrated to the dataset classes @s314cy
   * Get the number of samples in the training set.
   */
  _getTrainSize (dataset): number {
    const trainSplit = 1 - this.task.trainingInformation.validationSplit
    return dataset.Xtrain.shape[0] * trainSplit
  }

  /**
   * Build the appropriate training class (either local or distributed)
   */
  _initTrainer (dataset) {
    const TrainerClass = this.distributedTraining ? DistributedTrainer : LocalTrainer
    const trainer = new TrainerClass(
      this.task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB,
      this._buildRoundTracker(dataset)
    )

    // make property un-reactive through anonymous function accessor
    // otherwise get unexpected TFJS error due to Vue double bindings
    // on the loaded model
    this.trainer = () => trainer
  }

  /**
   * Connects the TrainingManager to the server
   */
  async connectClientToServer () {
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
   * Disconnects the TrainingManager from the server
   */
  disconnect () {
    this.client.disconnect()
  }

  /**
   * Main training function
   * @param {boolean} distributed - use distributed training (true) or local training (false)
   */
  async joinTraining (distributed: boolean) {
    if (distributed && !this.isConnected) {
      await this.connectClientToServer()
      if (!this.isConnected) {
        distributed = false
        this.logger.error('Distributed training is not available.')
      }
    }
    this.distributedTraining = distributed
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
        this._initTrainer(processedDataset)
        this.trainer().trainModel(processedDataset)
        this.isTraining = true
      } else {
        // print error message
        this.logger.error(
          `Invalid input format : Number of data points with valid format: ${statusValidation.nbAccepted} out of ${nbrFiles}`
        )
      }
    }
  }

  /**
   * Stops the training function and disconnects from
   */
  async stopTraining () {
    this.trainer().stopTraining()
    if (this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
    this.logger.success('Training was successfully interrupted.')
    this.isTraining = false
  }
}

export default TrainingManager
