import { Actor } from '../actor.js';
import { TrainingInformant } from './decentralised/training_informant.js';
import { TrainingManager } from './training_manager.js';
import { getClient } from '../communication/helpers.js';

// number of files that should be loaded (required by the task)
function nbrFiles(task) {
  const llist = task.trainingInformation.LABEL_LIST;
  return llist ? llist.length : 1;
}
export class Trainer extends Actor {
  /**
   * Constructor for Trainer
   * @param {Task} task - task on which the tasking shall be performed
   * @param {string} platform - system platform (e.g. deai or feai)
   * @param {Logger} logger - logging system (e.g. toaster)
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor(task, platform, logger, helper) {
    super(task, logger, nbrFiles(task), helper);
    this.isConnected = false;
    this.isTraining = false;
    this.distributedTraining = false;
    this.platform = platform;
    // Delivers training feedback to the user
    this.trainingInformant = new TrainingInformant(10, this.task.taskID);
    console.log('***** Constructor *****');
  }

  /**
   * Mimics the created hooks of Vue
   * @param {boolean} useIndexedDB - use indexededDB parameter from Vuex store
   */
  created(useIndexedDB) {
    console.log('***** Created *****');
    // Take care of communication processes
    this.client = getClient(
      this.platform,
      this.task,
      null //TODO: this.$store.getters.password(this.id)
    );
    console.log(this.trainingInformant);
    // Assist with the training loop
    this.trainingManager = new TrainingManager(
      this.task,
      this.client,
      this.trainingInformant,
      useIndexedDB
    );
    console.log(this.trainingInformant);
  }

  /**
   * Connects the trainer to the server
   */
  async connectClientToServer() {
    // Connect to centralized server
    this.isConnected = await this.client.connect();
    if (this.isConnected) {
      this.logger.success(
        'Succesfully connected to server. Distributed training available.'
      );
    } else {
      console.log('Error in connecting');
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      );
    }
  }

  /**
   * Disconnects the trainer from the server
   */
  disconnect() {
    this.client.disconnect();
  }

  /**
   * Main training function
   * @param {boolean} distributed - use distributed training (true) or local training (false)
   */
  async joinTraining(distributed) {
    console.log(this.trainingInformant);
    if (distributed && !this.isConnected) {
      await this.connectClientToServer();
      if (!this.isConnected) {
        distributed = false;
        this.logger.error('Distributed training is not available.');
      }
    }
    this.distributedTraining = distributed;
    const nbrFiles = this.fileUploadManager.numberOfFiles();
    // Check that the user indeed gave a file
    if (nbrFiles == 0) {
      this.logger.error(`Training aborted. No uploaded file given as input.`);
    } else {
      // Assume we only read the first file
      this.logger.success(
        `Thank you for your contribution. Data preprocessing has started`
      );
      const filesElement =
        nbrFiles > 1
          ? this.fileUploadManager.getFilesList()
          : this.fileUploadManager.getFirstFile();
      var statusValidation = { accepted: true };
      // get task  specific information (preprocessing steps, precheck function)
      if (this.taskHelper.precheckData) {
        // data checking is optional
        statusValidation = await this.taskHelper.precheckData(
          filesElement,
          this.task.trainingInformation
        );
      }
      if (statusValidation.accepted) {
        // preprocess data
        const processedDataset = await this.taskHelper.dataPreprocessing(
          filesElement
        );
        this.logger.success(
          `Data preprocessing has finished and training has started`
        );
        console.log(processedDataset);
        this.trainingManager.trainModel(processedDataset, distributed);
        this.isTraining = true;
      } else {
        // print error message
        this.logger.error(
          `Invalid input format : Number of data points with valid format: ${statusValidation.nr_accepted} out of ${nbrFiles}`
        );
      }
    }
  }
  /**
   * Stops the training function and disconnects from
   */
  async stopTraining() {
    this.trainingManager.stopTraining();
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
    this.logger.success('Training was successfully interrupted.');
    this.isTraining = false;
  }
}

export default Trainer;
