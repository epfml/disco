import { TrainingChart } from './training_chart';

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  /**
   *
   * @param {Number} length the number of messages to be kept to inform the users about status of communication with other peers.
   * @param {String} taskName the task's name.
   */
  constructor(length, taskName) {
    this.taskName = taskName;
    // number of people with whom I've shared my model
    this.whoReceivedMyModel = new Set();

    // how many times the model has been averaged with someone's else model
    this.nbrUpdatesWithOthers = 0;

    // how much time I've been waiting for a model
    this.waitingTime = 0;

    // number of weight requests I've responded to
    this.nbrWeightRequests = 0;

    // message feedback from peer-to-peer training
    this.nbrMessageToShow = length;
    this.messages = [];

    // validation accurarcy chart
    this.validationAccuracyChart = null; //new TrainingChart("validationAccuracy_".concat(taskName), "Validation Accuracy")
    this.validationAccuracy = null;

    // training accuracy chart
    this.trainingAccuracyChart = null; // new TrainingChart("trainingAccuracy_".concat(taskName), "Training Accuracy")
    this.trainingAccuracy = null;
  }

  /**
   * Updates the set of peers who received my model.
   * @param {String} peerName the peer's name to whom I recently shared my model to.
   */
  updateWhoReceivedMyModel(peerName) {
    this.whoReceivedMyModel.add(peerName);
  }

  /**
   * Updates the number of updates I did with other peers.
   * @param {Number} nbrUpdates the number of updates I did thanks to other peers contribution since the last update of the parameter.
   */
  updateNbrUpdatesWithOthers(nbrUpdates) {
    this.nbrUpdatesWithOthers += nbrUpdates;
  }

  /**
   * Updates the time I waited to receive weights.
   * @param {Number} time
   */
  updateWaitingTime(time) {
    this.waitingTime += time;
  }

  /**
   * Updates the number of weights request I received.
   * @param {Number} nbrRequests the number of weight requests I received since the last update of the parameter.
   */
  updateNbrWeightsRequests(nbrRequests) {
    this.nbrWeightRequests += nbrRequests;
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg a message.
   */
  addMessage(msg) {
    if (this.messages.length >= this.nbrMessageToShow) {
      this.messages.shift();
    }
    this.messages.push(msg);
  }

  /**
   * Initialize the charts of the training information.
   * Warning: can only be called once the component (to which the trianing informant is associated) has been rendered at least once.
   */
  initializeCharts() {
    this.validationAccuracyChart = new TrainingChart(
      'validationAccuracy_'.concat(this.taskName),
      'Validation Accuracy'
    );
    this.trainingAccuracyChart = new TrainingChart(
      'trainingAccuracy_'.concat(this.taskName),
      'Training Accuracy'
    );
  }

  /**
   * Method used to update the two charts to give user informations about the training process.
   * @param {Number} epoch the epoch number of the current training.
   * @param {Number} trainingAccuracy the accuracy achieved by the model in the given epoch.
   * @param {Number} validationAccuracy the validation accuracy achieved by the model in the given epoch.
   */
  updateCharts(epoch, validationAccuracy, trainingAccuracy) {
    console.log(this);
    this.validationAccuracyChart.updateGraph(epoch, validationAccuracy);
    this.trainingAccuracyChart.updateGraph(epoch, trainingAccuracy);
  }

  /**
   * Returns the chart's training accuracy ID
   */
  getChartTrainingAccuracyID() {
    return 'chart_trainingAccuracy_'.concat(this.taskName);
  }

  /**
   * Returns the chart's training accuracy ID
   */
  getValTrainingAccuracyID() {
    return 'val_trainingAccuracy_'.concat(this.taskName);
  }

  /**
   * Returns the chart's validation accuracy ID
   */
  getChartValidationAccuracyID() {
    return 'chart_validationAccuracy_'.concat(this.taskName);
  }

  /**
   * Returns the chart's validation accuracy ID
   */
  getValValidationAccuracyID() {
    return 'val_validationAccuracy_'.concat(this.taskName);
  }
}
