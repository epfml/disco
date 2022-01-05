import {
  getWorkingModel,
  updateWorkingModel,
  getWorkingModelMetadata,
} from '../memory/helpers';

const MANY_EPOCHS = 9999;

/**
 * Class that deals with the model of a task.
 * Takes care of memory management of the model and the training of the model.
 */
export class TrainingManager {
  /**
   * Constructs the training manager.
   * @param {Object} task the trained task
   * @param {Object} client the client
   * @param {Object} trainingInformant the training informant
   * @param {Boolean} useIndexedDB use IndexedDB (browser only)
   */
  constructor(task, client, trainingInformant, useIndexedDB) {
    this.task = task;
    this.client = client;
    this.trainingInformant = trainingInformant;

    this.useIndexedDB = useIndexedDB;
    this.stopTrainingRequested = false;

    this.model = null;
    this.data = null;
    this.labels = null;
  }

  /**
   * Setter called by the UI to update the IndexedDB status midway through
   * training.
   * @param {Boolean} payload whether or not to use IndexedDB
   */
  setIndexedDB(payload) {
    this.useIndexedDB = payload ? true : false;
  }

  stopTraining() {
    this.stopTrainingRequested = true;
  }

  async resumeTraining(distributedTraining) {
    this.model.stopTraining = false;
    this.stopTrainingRequested = false;
    distributedTraining ? this._trainDistributed() : this._trainLocally();
  }

  /**this.data = null;
    this.labels = null;
   * Train the task's model either alone or in a distributed fashion depending on the user's choice.
   * @param {Object} dataset the dataset to train on
   * @param {Boolean} distributedTraining train in a distributed fashion
   */
  async trainModel(dataset, distributedTraining) {
    this.data = dataset.Xtrain;
    this.labels = dataset.ytrain;

    /**
     * If IndexedDB is turned on and the working model exists, then load the
     * existing model from IndexedDB. Otherwise, create a fresh new one.
     */
    const modelParams = [
      this.task.taskID,
      this.task.trainingInformation.modelID,
    ];
    if (this.useIndexedDB && (await getWorkingModelMetadata(...modelParams))) {
      this.model = await getWorkingModel(...modelParams);
    } else {
      this.model = await this.task.createModel();
    }

    // Continue local training from previous epoch checkpoint
    if (
      this.model.getUserDefinedMetadata() === undefined ||
      distributedTraining
    ) {
      this.model.setUserDefinedMetadata({ epoch: 0 });
    }

    const info = this.task.trainingInformation;
    this.model.compile(info.modelCompileData);

    if (info.learningRate) {
      this.model.optimizer.learningRate = info.learningRate;
    }

    distributedTraining ? this._trainDistributed() : this._trainLocally();
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   * @param {Object} model The current model being trained.
   * @param {Number} epoch The current training loop's epoch.
   */
  async _onEpochBegin(epoch) {
    console.log(`EPOCH (${epoch + 1}):`);
    await this.client.onEpochBeginCommunication(
      this.model,
      epoch,
      this.trainingInformant
    );
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the subroutines
   * for the training informant and client.
   * @param {Object} model The current model being trained.
   * @param {Number} epoch The current training loop's epoch.
   * @param {Number} accuracy The accuracy achieved by the model in the given epoch
   * @param {Number} validationAccuracy The validation accuracy achieved by the model in the given epoch
   */
  async _onEpochEnd(epoch, accuracy, validationAccuracy) {
    this.trainingInformant.updateGraph(epoch, validationAccuracy, accuracy);
    console.log(
      `Train Accuracy: ${(accuracy * 100).toFixed(2)},
      Val Accuracy:  ${(validationAccuracy * 100).toFixed(2)}\n`
    );
    await this.client.onEpochEndCommunication(
      this.model,
      epoch,
      this.trainingInformant
    );
  }

  async _onTrainBegin() {
    await this.client.onTrainBeginCommunication(
      this.model,
      this.trainingInformant
    );
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   * @param {Object} model The current model being trained.
   */
  async _onTrainEnd() {
    await this.client.onTrainEndCommunication(
      this.model,
      this.trainingInformant
    );
  }

  async _trainLocally() {
    const info = this.task.trainingInformation;

    await this.model.fit(this.data, this.labels, {
      initialEpoch: this.model.getUserDefinedMetadata().epoch,
      epochs: info.epochs ?? MANY_EPOCHS,
      batchSize: info.batchSize,
      validationSplit: info.validationSplit,
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          this.trainingInformant.updateGraph(
            epoch + 1,
            (logs.val_acc * 100).toFixed(2),
            (logs.acc * 100).toFixed(2)
          );
          console.log(
            `EPOCH (${epoch + 1}):
            Train Accuracy: ${(logs.acc * 100).toFixed(2)},
            Val Accuracy:  ${(logs.val_acc * 100).toFixed(2)}\n`
          );
          if (this.useIndexedDB) {
            await updateWorkingModel(
              this.task.taskID,
              info.modelID,
              this.model
            );
          }
          if (this.stopTrainingRequested) {
            this.model.setUserDefinedMetadata({ epoch: epoch + 1 });
            this.model.stopTraining = true;
          }
        },
      },
    });
  }

  async _trainDistributed() {
    const info = this.task.trainingInformation;

    await this.model.fit(this.data, this.labels, {
      initialEpoch: this.model.getUserDefinedMetadata().epoch,
      epochs: info.epochs ?? MANY_EPOCHS,
      batchSize: info.batchSize,
      validationSplit: info.validationSplit,
      shuffle: true,
      callbacks: {
        onTrainBegin: async (logs) => {
          await this._onTrainBegin();
        },
        onTrainEnd: async (logs) => {
          await this._onTrainEnd();
        },
        onEpochBegin: async (epoch, logs) => {
          await this._onEpochBegin(epoch);
        },
        onEpochEnd: async (epoch, logs) => {
          await this._onEpochEnd(
            epoch + 1,
            (logs.acc * 100).toFixed(2),
            (logs.val_acc * 100).toFixed(2)
          );
          if (this.useIndexedDB) {
            await updateWorkingModel(
              this.task.taskID,
              info.modelID,
              this.model
            );
          }
          if (this.stopTrainingRequested) {
            this.model.setUserDefinedMetadata({ epoch: epoch + 1 });
            this.model.stopTraining = true;
          }
        },
      },
    });
  }
}
