import {
  getWorkingModel,
  updateWorkingModel,
  getWorkingModelMetadata,
} from '../memory/helpers';

import * as tf from '@tensorflow/tfjs';

// Extra functions that are used to create Dataset object to be able to perform batch wise preprocessing of images.

function trainDataGenerator(dataset, labels, trainingInformation) {
  return function* dataGenerator() {
    for (let i = 0; i < dataset.shape[0] * (1 - trainingInformation.validationSplit); i++) {
      var tensor = tf.tensor(dataset.arraySync()[i]);
      if (trainingInformation.resize) {
        tensor = tf.image.resizeBilinear(
          tensor,
          [trainingInformation.RESIZED_IMAGE_H,
          trainingInformation.RESIZED_IMAGE_W]);
      }
      yield { xs: tensor, ys: tf.tensor(labels.arraySync()[i]) }
    }
  }
}

function validationDataGenerator(dataset, labels, trainingInformation) {
  return function* dataGenerator() {
    const start_index = Math.floor(dataset.shape[0] * (1 - trainingInformation.validationSplit))
    for (let i = start_index; i < dataset.shape[0]; i++) {
      var tensor = tf.tensor(dataset.arraySync()[i]);
      if (trainingInformation.resize) {
        tensor = tf.image.resizeBilinear(
          tensor,
          [trainingInformation.RESIZED_IMAGE_H,
          trainingInformation.RESIZED_IMAGE_W]);
      }
      yield { xs: tensor, ys: tf.tensor(labels.arraySync()[i]) }
    }
  }
}

const MANY_EPOCHS = 9999;
const SIZE_THRESHOLD = 1e9; //1 GigaByte

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

  /**
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
    if (this.model.getUserDefinedMetadata() === undefined) {
      this.model.setUserDefinedMetadata({ epoch: 0 });
    }

    const info = this.task.trainingInformation;
    this.model.compile(info.modelCompileData);

    if (info.learningRate) {
      this.model.optimizer.learningRate = info.learningRate;
    }

    // Ensure training can start
    this.model.stopTraining = false;
    this.stopTrainingRequested = false;

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
      `Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
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

    var dataSize = -1;

    if (info.resize) {
      // 8 is for 8 bytes in a single element and 3 is for the 3 color channels for image tasks
      dataSize = 8 * 3 * info.RESIZED_IMAGE_H * info.RESIZED_IMAGE_W * this.data.shape[0];
    }

    if (dataSize > SIZE_THRESHOLD) {
      console.log("Memory training");
    // Creation of Dataset objects for training
    const trainData = tf.data.generator(
      trainDataGenerator(
        this.data,
        this.labels,
        info))
      .batch(info.batchSize);
    const valData = tf.data.generator(
      validationDataGenerator(
        this.data,
        this.labels,
        info))
      .batch(info.batchSize);

    await this.model.fitDataset(trainData, {
      epochs: info.epochs,
      validationData: valData,
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
            this.model.setUserDefinedMetadata({ epoch: epoch + 1 });
            await updateWorkingModel(
              this.task.taskID,
              info.modelID,
              this.model
            );
          }
          if (this.stopTrainingRequested) {
            this.model.stopTraining = true;
            this.stopTrainingRequested = false;
          }
        },
      },
    });
  }

  else {
    console.log("Fast training");

    let resized_data = this.data;

    if(info.resize) {
      resized_data = tf.image.resizeBilinear(
        this.data,
        [info.RESIZED_IMAGE_H,
        info.RESIZED_IMAGE_W]);
    }

    await this.model.fit(this.data, this.labels, {
      initialEpoch: 0,
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
            this.model.stopTraining = true;
            this.stopTrainingRequested = false;
          }
        },
      },
    });
  }
}
  async _trainDistributed() {
    const info = this.task.trainingInformation;

    //We calculate the size of the dataset to know if we need to use memory efficient training
    var dataSize = -1;

    if (info.resize) {
      // 8 is for 8 bytes in a single element and 3 is for the 3 color channels for image tasks
      dataSize = 8 * 3 * info.RESIZED_IMAGE_H * info.RESIZED_IMAGE_W * this.data.shape[0];
    }

    if (dataSize > SIZE_THRESHOLD) {
      console.log("Memory training");
      // Creation of Dataset objects for training
      const trainData = tf.data.generator(
        trainDataGenerator(
          this.data,
          this.labels,
          info))
        .batch(info.batchSize);
      const valData = tf.data.generator(
        validationDataGenerator(
          this.data,
          this.labels,
          info))
        .batch(info.batchSize);

      await this.model.fitDataset(trainData, {
        epochs: info.epochs,
        validationData: valData,
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
              this.model.stopTraining = true;
              this.stopTrainingRequested = false;
            }
          },
        },
      });
    }
    else {
      console.log("Fast training");

      let resized_data = this.data;

      if(info.resize) {
        resized_data = tf.image.resizeBilinear(
          this.data,
          [info.RESIZED_IMAGE_H,
          info.RESIZED_IMAGE_W]);
      }

      await this.model.fit(resized_data, this.labels, {
        initialEpoch: 0,
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
              this.model.stopTraining = true;
              this.stopTrainingRequested = false;
            }
          },
        },
      });
    }
  }
}