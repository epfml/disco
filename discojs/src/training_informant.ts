import { List, Repeat, Set } from "immutable";
import { TrainingSchemes } from './training/trainingSchemes'
const nbEpochsOnGraphs = 10

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  taskID: string;
  taskTrainingScheme: string;
  // Decentralized Informations
  // number of people with whom I've shared my model
  whoReceivedMyModel = Set();
  nbrUpdatesWithOthers: number;
  waitingTime: number;
  nbrWeightRequests: number;
  // message feedback from peer-to-peer training
  messages = List();
  // Federated Informations
  currentRound: number;
  currentNumberOfParticipants: number;
  totalNumberOfParticipants: number;
  averageNumberOfParticipants : number;
  // Common Informations
  validationAccuracyChart: unknown;
  validationAccuracy: number;
  trainingAccuracyChart: unknown;
  trainingAccuracy: number;
  displayHeatmap: boolean;
  currentValidationAccuracy: number;
  validationAccuracyDataSerie = Repeat(0, nbEpochsOnGraphs).toList();
  currentTrainingAccuracy: number;
  trainingAccuracyDataSerie = Repeat(0, nbEpochsOnGraphs).toList();
  weightsIn: number;
  biasesIn: number;
  weightsOut: number;
  biasesOut: number;

  /**
   *
   * @param nbrMessagesToShow the number of messages to be kept to inform the users about status of communication with other peers.
   * @param taskID the task's name.
   */
  constructor (
    private readonly nbrMessagesToShow: number,
    taskID: string,
    taskTrainingScheme: TrainingSchemes
  ) {
    this.taskID = taskID
    this.taskTrainingScheme = taskTrainingScheme

    // how many times the model has been averaged with someone's else model
    this.nbrUpdatesWithOthers = 0

    // how much time I've been waiting for a model
    this.waitingTime = 0

    // number of weight requests I've responded to
    this.nbrWeightRequests = 0

    // statistics received from the server
    this.currentRound = 0
    this.currentNumberOfParticipants = 0
    this.totalNumberOfParticipants = 0
    this.averageNumberOfParticipants = 0

    // validation accuracy chart
    this.validationAccuracyChart = null // new TrainingChart("validationAccuracy_".concat(taskID), "Validation Accuracy")
    this.validationAccuracy = 0

    // training accuracy chart
    this.trainingAccuracyChart = null // new TrainingChart("trainingAccuracy_".concat(taskID), "Training Accuracy")
    this.trainingAccuracy = 0

    // is the model using Interoperability (default to false)
    this.displayHeatmap = false

    // default values for the validation and training charts
    this.currentValidationAccuracy = 0
    this.currentTrainingAccuracy = 0
  }

  /**
   * Updates the set of peers who received my model.
   * @param {String} peerName the peer's name to whom I recently shared my model to.
   */
  updateWhoReceivedMyModel (peerName: string): void {
    this.whoReceivedMyModel = this.whoReceivedMyModel.add(peerName)
  }

  /**
   * Updates the number of updates I did with other peers.
   * @param {Number} nbrUpdates the number of updates I did thanks to other peers contribution since the last update of the parameter.
   */
  updateNbrUpdatesWithOthers (nbrUpdates: number): void {
    this.nbrUpdatesWithOthers += nbrUpdates
  }

  /**
   * Updates the time I waited to receive weights.
   * @param {Number} time
   */
  updateWaitingTime (time: number): void {
    this.waitingTime += time
  }

  /**
   * Updates the number of weights request I received.
   * @param {Number} nbrRequests the number of weight requests I received since the last update of the parameter.
   */
  updateNbrWeightsRequests (nbrRequests: number): void {
    this.nbrWeightRequests += nbrRequests
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg a message.
   */
  addMessage (msg: string): void {
    if (this.messages.size >= this.nbrMessagesToShow) {
      this.messages = this.messages.shift()
    }
    this.messages = this.messages.push(msg)
  }

  /**
   * Update the server statistics with the JSON received from the server
   * For now it's just the JSON, but we might want to keep it as a dictionnary
   * @param {any} receivedStatistics statistics received from the server.
   */
  updateWithServerStatistics (receivedStatistics: Record<string, number>): void {
    this.currentRound = receivedStatistics.round
    this.currentNumberOfParticipants = receivedStatistics.currentNumberOfParticipants
    this.totalNumberOfParticipants = receivedStatistics.totalNumberOfParticipants
    this.averageNumberOfParticipants = receivedStatistics.averageNumberOfParticipants
  }

  /**
   *  Updates the data to be displayed on the validation accuracy graph.
   * @param {Number} validationAccuracy the current validation accuracy of the model
   */
  updateValidationAccuracyGraph (validationAccuracy: number): void {
    this.validationAccuracyDataSerie =
      this.validationAccuracyDataSerie.shift().push(validationAccuracy)
    this.currentValidationAccuracy = validationAccuracy
  }

  /**
   * Returns wether or not the Task's training scheme is Decentralized
   * @returns Boolean value
   */
   isTaskTrainingSchemeDecentralized () {
    return this.taskTrainingScheme === TrainingSchemes.DECENTRALIZED
  }

  /**
   * Returns wether or not the Task's training scheme is Federated
   * @returns Boolean value
   */
  isTaskTrainingSchemeFederated () {
    return this.taskTrainingScheme === TrainingSchemes.FEDERATED
  }

  /**
   *  Updates the data to be displayed on the training accuracy graph.
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  updateTrainingAccuracyGraph (trainingAccuracy: number): void {
    this.trainingAccuracyDataSerie =
      this.trainingAccuracyDataSerie.shift().push(trainingAccuracy)
    this.currentTrainingAccuracy = trainingAccuracy
  }
}
