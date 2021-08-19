import { training, trainingDistributed } from './training-script';
import { storeModel } from '../my_memory_script/indexedDB_script';
import * as tf from '@tensorflow/tfjs';
import { onEpochEndCommon } from '../communication_script/helpers';

/**
 * Class that deals with the model of a task.
 * Takes care of memory management of the model and the training of the model.
 */
export class TrainingManager {
  /**
   *
   * @param {Object} trainingInformation the training information that can be found in script of the task.
   */
  constructor(trainingInformation) {
    this.trainingInformation = trainingInformation;
    this.modelCompileData = trainingInformation.modelCompileData;
    this.communicationManager = null;
    this.trainingInformant = null;
    this.environment = null;

    // current epoch of the model
    this.myEpoch = 0;
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
      await training(
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
      await this.communicationManager.updateReceivers();
      await trainingDistributed(
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
  onEpochBegin() {
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
  async onEpochEnd(model, epoch, accuracy, validationAccuracy) {
    this.trainingInformant.updateCharts(epoch, validationAccuracy, accuracy);
    // At the moment, don't allow for new participants to come in.
    // Wait for a synchronization scheme (on epoch number).
    await this.communicationManager.updateReceivers();
    await onEpochEndCommon(
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

  /**
   * Save the working model for later use.
   */
  async saveModel() {
    const savedModelPath = 'indexeddb://working_'.concat(
      this.trainingInformation.modelId
    );
    let model = await tf.loadLayersModel(savedModelPath);

    storeModel(model, 'saved_'.concat(this.trainingInformation.modelId));
    this.environment.$toast.success(
      'The '.concat(this.trainingInformation.modelId).concat(' has been saved.')
    );
    setTimeout(this.environment.$toast.clear, 30000);
  }

  /**
   * Initialize the communication manager (used when training with other peers)
   * @param {CommunicationManager} communicationManager the communication manager of the task.
   */
  initializeCommunicationManager(communicationManager) {
    this.communicationManager = communicationManager;
  }

  /**
   * Initialize the training informant (used to collect feed-backs from the training loop).
   * @param {TrainingInformant} trainingInformant the training informant of the task.
   */
  initializeTrainingInformant(trainingInformant) {
    this.trainingInformant = trainingInformant;
  }

  /**
   * Initialize the component's environment (used to be able to send toast notifcation to user).
   * @param {*} environment the environment of the component to which the training manager is associated.
   */
  initializeEnvironment(environment) {
    this.environment = environment;
  }

  /**
   * Global initialization process of the training manger.
   * @param {*} communicationManager the communication manager of the task.
   * @param {*} trainingInformant the training informant of the task.
   * @param {*} environment the environment of the component to which the training manager is associated.
   */
  async initialization(communicationManager, trainingInformant, environment) {
    this.initializeCommunicationManager(communicationManager);
    this.initializeTrainingInformant(trainingInformant);
    this.initializeEnvironment(environment);
  }

  async reloadState(communicationManager, trainingInformant, environment) {
    await this.initializeModel();
    this.initializeCommunicationManager(communicationManager);
    this.initializeTrainingInformant(trainingInformant);
    this.initializeEnvironment(environment);
  }
}
