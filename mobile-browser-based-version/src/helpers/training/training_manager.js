import { updateWorkingModel } from '../memory/helpers.js';

/**
 * Class that deals with the model of a task.
 * Takes care of memory management of the model and the training of the model.
 */
export class TrainingManager {
  /**
   * Constructs the training manager.
   * @param {Object} task the trained task
   * @param {Object} communicationManager the communication manager
   * @param {Object} trainingInformant the training informant
   * @param {Boolean} useIndexedDB use IndexedDB (browser only)
   */
  constructor(task, communicationManager, trainingInformant, useIndexedDB) {
    this.task = task;
    this.communicationManager = communicationManager;
    this.trainingInformant = trainingInformant;
    this.useIndexedDB = useIndexedDB;
    // Current epoch of the model
    this.myEpoch = 0;
  }

  /**
   * Setter called by the UI to update the IndexedDB status midway through
   * training.
   * @param {Boolean} payload whether or not to use IndexedDB
   */
  setIndexedDB(payload) {
    // Ensure the attribute is always a boolean
    this.useIndexedDB = payload ? true : false;
  }

  /**
   * Train the task's model either alone or in a distributed fashion depending on the user's choice.
   * @param {Boolean} distributed     boolean to states if training alone or training in a distributed fashion.
   * @param {Object} processedData   data that has been processed by the custom function define in the script of the task. Has the form {accepted: _, Xtrain: _, yTrain:_}.
   */
  async trainModel(distributed, processedData) {
    var Xtrain = processedData.Xtrain;
    var ytrain = processedData.ytrain;
    // notify the user that training has started
    this.environment.$toast.success(
      `Thank you for your contribution. Training has started`
    );
    setTimeout(this.environment.$toast.clear, 30000);
    if (!distributed) {
      await this._training(
        this.trainingInformation.modelId,
        Xtrain,
        ytrain,
        this.trainingInformation.batchSize,
        this.trainingInformation.validationSplit,
        this.trainingInformation.epoch,
        this.trainingInformant,
        this.trainingInformation.modelCompileData,
        this.trainingInformation.learningRate
      );
    } else {
      await this.communicationManager.updateReceivers(this);
      await this._trainingDistributed(
        this.trainingInformation.modelId,
        Xtrain,
        ytrain,
        this.trainingInformation.epoch,
        this.trainingInformation.batchSize,
        this.trainingInformation.validationSplit,
        this.trainingInformation.modelCompileData,
        this,
        this.communicationManager.peerjs,
        this.communicationManager.recvBuffer,
        this.trainingInformation.learningRate
      );
    }
    // notify the user that training has ended
    this.environment.$toast.success(
      this.trainingInformation.modelId.concat(` has finished training!`)
    );
    setTimeout(this.environment.$toast.clear, 30000);
  }

  /**
   * Method called at the begining of each training epoch.
   */
  _onEpochBegin() {
    // To be modified in future ...
    // myEpoch will be removed
    console.log('EPOCH: ', ++this.myEpoch);
  }

  /**
   * Method called at the end of each epoch.
   * Configured to handle communication with peers.
   * @param {Number} epoch The epoch number of the current training
   * @param {Number} accuracy The accuracy achieved by the model in the given epoch
   * @param {Number} validationAccuracy The validation accuracy achieved by the model in the given epoch
   */
  async _onEpochEnd(model, epoch, accuracy, validationAccuracy) {
    this.trainingInformant.updateCharts(epoch, validationAccuracy, accuracy);
    // At the moment, don't allow for new participants to come in.
    // Wait for a synchronization scheme (on epoch number).
    await this.communicationManager.updateReceivers(this);
    await this.communicationManager._onEpochEndCommunication(
      model,
      epoch,
      this.communicationManager.receivers,
      this.communicationManager.recvBuffer,
      this.communicationManager.peerjsId,
      this.trainingInformation.receivedMessagesThreshold,
      this.communicationManager.peerjs,
      this.trainingInformant
    );
  }

  async _training(model, data, labels) {
    let trainingInformation = this.task.trainingInformation;

    model.compile(trainingInformation.modelCompileData);

    if (trainingInformation.learningRate) {
      model.optimizer.learningRate = trainingInformation.learningRate;
    }

    console.log('Training started');
    await model
      .fit(data, labels, {
        batchSize: trainingInformation.batchSize,
        epochs: trainingInformation.epoch,
        validationSplit: trainingInformation.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            this.trainingInformant.updateCharts(
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
      })
      .then(async (info) => {
        console.log('Training finished', info.history);
      });
  }

  async _trainingDistributed(model, data, labels) {
    let trainingInformation = this.task.trainingInformation;

    model.compile(trainingInformation.modelCompileData);

    if (trainingInformation.learningRate) {
      model.optimizer.learningRate = trainingInformation.learningRate;
    }

    console.log(
      `Training for ${this.task.displayInformation.taskTitle} task started. ` +
        `Running for ${trainingInformation.epoch} epochs.`
    );
    await model
      .fit(data, labels, {
        epochs: trainingInformation.epoch,
        batchSize: trainingInformation.batchSize,
        validationSplit: trainingInformation.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochBegin: this._onEpochBegin(),
          onEpochEnd: async (epoch, logs) => {
            await this._onEpochEnd(
              model,
              epoch + 1,
              (logs.acc * 100).toFixed(2),
              (logs.val_acc * 100).toFixed(2)
            );
            console.log(
              `EPOCH (${epoch + 1}):
            Train Accuracy: ${(logs.acc * 100).toFixed(2)},
            Val Accuracy:  ${(logs.val_acc * 100).toFixed(2)}\n`
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
      })
      .then(async (info) => {
        console.log('Training finished', info.history);
      });
  }
}
