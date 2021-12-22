import {
  getWorkingModel,
  updateWorkingModel,
  getWorkingModelMetadata,
} from '../memory/helpers';
import * as modelDefinition from '../model_definition/model';

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
    // Current epoch of the model
    this.myEpoch = 0;
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
   * @param {personalizationType} personalizationTypeChosen the type of personalization chosen for the model.
   */
  async trainModel(
    dataset,
    distributedTraining,
    personalizationTypeChosen = modelDefinition.personalizationType.NONE
  ) {
    let data = dataset.Xtrain;
    let labels = dataset.ytrain;

    let model;

    switch (personalizationTypeChosen) {
      case modelDefinition.personalizationType.NONE:
        model = new modelDefinition.Model(this.task, this.useIndexedDB);
        break;

      case modelDefinition.personalizationType.INTEROPERABILITY:
        model = new modelDefinition.InteroperabilityModel(
          this.task,
          this.useIndexedDB
        );
        break;
    }
    await model.init();

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
  _onEpochBegin(model, epoch) {
    // To be modified in future ... myEpoch will be removed
    console.log('EPOCH: ', ++this.myEpoch);
    this.client.onEpochBeginCommunication(model, epoch);
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
    await this.client.onEpochEndCommunication(
      model,
      epoch,
      this.trainingInformant
    );
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

    model.getModel().compile(trainingInformation.modelCompileData);

    if (trainingInformation.learningRate) {
      model.getModel().optimizer.learningRate =
        trainingInformation.learningRate;
    }

    console.log('Training started');
    await model
      .getModel()
      .fit(data, labels, {
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
                model.getModel()
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

    model.getModel().compile(trainingInformation.modelCompileData);

    if (trainingInformation.learningRate) {
      model.getModel().optimizer.learningRate =
        trainingInformation.learningRate;
    }

    console.log(
      `Training for ${this.task.displayInformation.taskTitle} task started. ` +
        `Running for ${trainingInformation.epoch} epochs.`
    );
    await model
      .getModel()
      .fit(data, labels, {
        epochs: trainingInformation.epoch,
        batchSize: trainingInformation.batchSize,
        validationSplit: trainingInformation.validationSplit,
        shuffle: true,
        callbacks: {
          onTrainEnd: async (logs) => {
            this._onTrainEnd(model);
          },
          onEpochBegin: async (epoch, logs) => {
            this._onEpochBegin(model.getSharedModel(), epoch);
          },
          onEpochEnd: async (epoch, logs) => {
            await this._onEpochEnd(
              model.getSharedModel(),
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
                model.getModel()
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
