import {
  getWorkingModel,
  updateWorkingModel,
  getWorkingModelMetadata,
} from '../memory/helpers';

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
  }

  /**
   * Setter called by the UI to update the IndexedDB status midway through
   * training.
   * @param {Boolean} payload whether or not to use IndexedDB
   */
  setIndexedDB(payload) {
    // Ensure the payload is always a boolean
    this.useIndexedDB = payload ? true : false;
  }

  /**
   * Train the task's model either alone or in a distributed fashion depending on the user's choice.
   * @param {Object} dataset the dataset to train on
   * @param {Boolean} distributedTraining train in a distributed fashion
   */
  async trainModel(dataset, distributedTraining) {
    let data = dataset.Xtrain;
    let labels = dataset.ytrain;
    /**
     * If IndexedDB is turned on and the working model exists, then load the
     * existing model from IndexedDB. Otherwise, create a fresh new one.
     */
    let modelParams = [this.task.taskID, this.task.trainingInformation.modelID];
    let model;
    if (this.useIndexedDB && (await getWorkingModelMetadata(...modelParams))) {
      model = await getWorkingModel(...modelParams);
    } else {
      model = await this.task.createModel();
    }

    let trainingParams = [model, data, labels];
    if (distributedTraining) {
      await this._trainingDistributed(...trainingParams);
    } else {
      await this._training(...trainingParams);
    }
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   * @param {Object} model The current model being trained.
   * @param {Number} epoch The current training loop's epoch.
   */
  async _onEpochBegin(model, epoch) {
    console.log(`EPOCH (${epoch + 1}):`);
    await this.client.onEpochBeginCommunication(
      model,
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
  async _onEpochEnd(model, epoch, accuracy, validationAccuracy) {
    this.trainingInformant.updateGraph(epoch, validationAccuracy, accuracy);
    console.log(
      `Train Accuracy: ${(accuracy * 100).toFixed(2)},
      Val Accuracy:  ${(validationAccuracy * 100).toFixed(2)}\n`
    );
    await this.client.onEpochEndCommunication(
      model,
      epoch,
      this.trainingInformant
    );
  }

  async _onTrainBegin(model) {
    await this.client.onTrainBeginCommunication(model, this.trainingInformant);
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   * @param {Object} model The current model being trained.
   */
  async _onTrainEnd(model) {
    await this.client.onTrainEndCommunication(model, this.trainingInformant);
  }

  async _training(model, data, labels) {
    let trainingInformation = this.task.trainingInformation;

    model.compile(trainingInformation.modelCompileData);

    if (trainingInformation.learningRate) {
      model.optimizer.learningRate = trainingInformation.learningRate;
    }

    console.log('Training started');
    await model.fit(data, labels, {
      batchSize: trainingInformation.batchSize,
      epochs: trainingInformation.epoch,
      validationSplit: trainingInformation.validationSplit,
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          this.trainingInformant.updateGraph(
            epoch + 1,
            (logs['val_acc'] * 100).toFixed(2),
            (logs['acc'] * 100).toFixed(2)
          );
          console.log(
            `EPOCH (${epoch + 1}):
            Train Accuracy: ${(logs['acc'] * 100).toFixed(2)},
            Val Accuracy:  ${(logs['val_acc'] * 100).toFixed(2)}\n`
          );
          console.log(`loss ${logs.loss.toFixed(4)}`);
          if (this.useIndexedDB) {
            await updateWorkingModel(
              this.task.taskID,
              trainingInformation.modelID,
              model
            );
          }
        },
      },
    });
  }

  async _trainingDistributed(model, data, labels) {
    let trainingInformation = this.task.trainingInformation;

    model.compile(trainingInformation.modelCompileData);

    if (trainingInformation.learningRate) {
      model.optimizer.learningRate = trainingInformation.learningRate;
    }

    const rounds =
      trainingInformation.epochs / trainingInformation.roundDuration;
    console.log(
      `Training for ${this.task.displayInformation.taskTitle} task started. ` +
        `Running for ${rounds} rounds of ${trainingInformation.roundDuration} epochs each. ` +
        `This represents ${trainingInformation.epochs} total epochs.`
    );

    await model.fit(data, labels, {
      epochs: trainingInformation.epochs,
      batchSize: trainingInformation.batchSize,
      validationSplit: trainingInformation.validationSplit,
      shuffle: true,
      callbacks: {
        onTrainBegin: async (logs) => {
          await this._onTrainBegin(model);
        },
        onTrainEnd: async (logs) => {
          await this._onTrainEnd(model);
        },
        onEpochBegin: async (epoch, logs) => {
          await this._onEpochBegin(model, epoch);
        },
        onEpochEnd: async (epoch, logs) => {
          await this._onEpochEnd(
            model,
            epoch + 1,
            (logs.acc * 100).toFixed(2),
            (logs.val_acc * 100).toFixed(2)
          );
          if (this.useIndexedDB) {
            await updateWorkingModel(
              this.task.taskID,
              trainingInformation.modelID,
              model
            );
          }
        },
      },
    });
  }
}
