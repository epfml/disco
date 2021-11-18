import { TrainingChart } from './training_chart';

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  /**
   *
   * @param {Number} length the number of messages to be kept to inform the users about status of communication with other peers.
   * @param {String} taskName the task's name.
   * @param {Boolean} verbose whether or not to print messages.
   */
  constructor(length, taskName, verbose = false) {
    this.taskName = taskName;

    /**
     * How much time I've been waiting for a model.
     */
    this.waitingTime = 0;

    /**
     * How much data do I own compared to the whole network.
     */
    this.dataShares = new Map();

    /**
     * Message feedback from training.
     */
    this.nbrMessageToShow = length;
    this.messages = [];
    this.verbose = verbose;

    /**
     * Validation accuracy chart.
     */
    this.validationAccuracyChart = null;
    this.validationAccuracy = null;

    /**
     * Training accuracy chart.
     */
    this.trainingAccuracyChart = null;
    this.trainingAccuracy = null;
  }

  /**
   * Updates the number of weights updates I did with the server.
   * @param {Number} nbrUpdates The number of updates.
   */
  updateNbrUpdatesWithOthers(nbrUpdates) {
    this.nbrUpdatesWithOthers += nbrUpdates;
  }

  /**
   * Updates the time I waited to receive aggregated weights from server.
   * @param {Number} time The time I waited for.
   */
  updateWaitingTime(time) {
    this.waitingTime += time;
  }

  /**
   * Updates the number of data samples held per client.
   * @param {Map} newShares The number of data samples held per client.
   */
  updateDataShares(newShares) {
    this.dataShares = new Map(...this.dataShares, ...newShares);
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg A message.
   */
  addMessage(msg) {
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()];
    const formattedTime = time
      .map((number) => String(number).padStart(2, '0'))
      .join(':');
    if (this.messages.length >= this.nbrMessageToShow) {
      this.messages.shift();
    }
    const message = `${formattedTime} ${msg}`;
    this.messages.push(message);
    if (this.verbose) {
      console.log(message);
    }
  }

  /**
   * Initialize the charts of the training information.
   * Warning: can only be called once the component (to which the training informant is associated) has been rendered at least once.
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
