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
  constructor(task, platform, useIndexedDB, logger, helper) {
    super(task, logger, nbrFiles(task), helper);
    this.isConnected = false;
    this.useIndexedDB = useIndexedDB;
    // Manager that returns feedbacks when training
    this.trainingInformant = new TrainingInformant(10, this.task.taskID);
    // Take care of communication processes
    this.client = getClient(
      platform,
      this.task,
      null //TODO: this.$store.getters.password(this.Id)
    );
    // Assist with the training loop
    this.trainingManager = new TrainingManager(
      this.task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB
    );
  }

  // wrapper for Vue interface update
  setIndexedDB(newValue) {
    this.useIndexedDB = newValue;
  }

  // connect
  async connect(useIndexedDB) {
    if (useIndexedDB !== undefined) {
      this.setIndexedDB(useIndexedDB);
    }
    // Create the training manager
    this.trainingManager = new TrainingManager(
      this.task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB
    );
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

  disconnect() {
    this.client.disconnect();
  }

  async joinTraining(distributed) {
    if (distributed && !this.isConnected) {
      this.logger.error('Distributed training is not available.');
      return;
    }
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
      if (!statusValidation.accepted) {
        // print error message
        this.logger.error(
          `Invalid input format : Number of data points with valid format: ${statusValidation.nr_accepted} out of ${nbrFiles}`
        );
      } else {
        // preprocess data
        const processedDataset = await this.taskHelper.dataPreprocessing(
          filesElement
        );
        this.logger.success(
          `Data preprocessing has finished and training has started`
        );
        this.trainingManager.trainModel(processedDataset, distributed);
      }
    }
  }
}

export default Trainer;
