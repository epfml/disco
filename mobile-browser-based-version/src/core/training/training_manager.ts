import { ModelActor } from '../model_actor'
import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer/trainer'
import { Client } from '../communication/client'
import { Task } from '../task/base/task'
import { Logger } from '../logging/logger'
import { TaskHelper } from '../task/base/task_helper'
import { TrainingSchemes } from './trainingSchemes'
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
  trainingScheme: TrainingSchemes
  useIndexedDB: boolean
  client: Client
  trainingInformant: TrainingInformant
  trainer: () => Trainer // we keep trainer as a function call due to reactivity issues with vue. (by @giordano-lucas)
  /**
   * Constructor for TrainingManager
   * @param {Task} task - task on which the tasking shall be performed
   * @param {Logger} logger - logging system (e.g. toaster)
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor (task: Task, logger: Logger, helper: TaskHelper<Task>, useIndexedDB: boolean) {
    super(task, logger, nbrFiles(task), helper)
    this.isConnected = false
    this.isTraining = false
    this.distributedTraining = false
    this.useIndexedDB = useIndexedDB
    // Take care of communication processes
    this.client = undefined
    this.trainingScheme = undefined
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
  }

  /**
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
   * Initialize the client depending on the trainingType Chosen
   */
  // Training scheme
  async initOrUpdateClient (trainingScheme : TrainingSchemes) {
    if (trainingScheme === TrainingSchemes.LOCAL) {
      this.client = undefined
      this.trainingScheme = trainingScheme
      console.log('No client needed when Training Locally')
    } else if (this.client === undefined || trainingScheme !== this.trainingScheme) {
      this.client = getClient(
        trainingScheme,
        this.task,
        undefined // TODO: this.$store.getters.password(this.id)
      )
      this.trainingScheme = trainingScheme
      console.log('Initialized client ' + trainingScheme)
    }
  }

  /**
   * Connects the TrainingManager to the server
   */
  async connectClientToServer (): Promise<void> {
    try {
      await this.client.connect()
      this.logger.success(
        'Successfully connected to server. Distributed training available.'
      )
      this.isConnected = true
    } catch (err) {
      console.log(`connect server: ${err}`)
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      )
      this.isConnected = false
    }
    console.log(this.isConnected)
  }

  /**
   * Disconnects the TrainingManager from the server
   */
  async disconnect () {
    await this.client.disconnect()
    this.isConnected = false
  }

  /**
   * Runs training using Local Scheme
   */
  async joinLocalTraining () {
    await this.joinTraining(TrainingSchemes.LOCAL)
  }

  /**
   * Runs training using Decentralized Scheme
   */
  async joinDecentralizedTraining () {
    await this.joinTraining(TrainingSchemes.DECENTRALIZED)
  }

  /**
   * Runs training using Federated Scheme
   */
  async joinFederatedTraining () {
    await this.joinTraining(TrainingSchemes.FEDERATED)
  }

  /**
   * TODO: @s314cy, this function needs to be cleaned up with the new data loader update.
   * Main training function
   * @param {TrainingSchemes} trainingScheme which training scheme to use (Local, Decentralized or Federated)
   */
  async joinTraining (trainingScheme: TrainingSchemes) {
    // Initialize the client
    await this.initOrUpdateClient(trainingScheme)

    // Connects to the server
    if (trainingScheme !== TrainingSchemes.LOCAL && !this.isConnected) {
      await this.connectClientToServer()
      if (!this.isConnected) {
        this.logger.error('Distributed training is not available.')
      } else {
        this.distributedTraining = true
      }
    }
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
    }
  }

  /**
   * Stops the training function and disconnects from
   */
  async stopTraining () {
    this.trainer().stopTraining()
    if (this.isConnected) {
      await this.client.disconnect()
    }
    this.logger.success('Training was successfully interrupted.')
    this.isTraining = false
  }
}
